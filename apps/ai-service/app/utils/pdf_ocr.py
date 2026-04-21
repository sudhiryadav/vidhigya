"""
Unified PDF text extraction + Tesseract OCR with preprocessing.

Used by document upload so indexing and chunking share the same per-page text.

Key goals for cover pages (the first ~N pages) of scanned filings:
- Higher DPI so stylised titles / party names survive OCR.
- Multi-PSM retry (uniform block + sparse text) picking the best-confidence
  result, because legal cover pages are structured but the rest of the
  document often isn't.
- Optional deskew via Tesseract's OSD.
- Post-OCR normalization that collapses OCR letter-spacing (``S H R I`` ->
  ``SHRI``) and repairs common look-alike artefacts — important for names
  that appear in bold centred blocks on cover pages.
"""

from __future__ import annotations

import io
import re
from difflib import SequenceMatcher
from typing import Callable, List, Optional

import fitz
import pytesseract
from PIL import Image, ImageOps

from app.core.config import settings


def _default_config() -> str:
    """Config used for generic body pages."""
    cfg = (settings.OCR_CONFIG or "").strip()
    if cfg:
        return cfg
    # LSTM + uniform block of text is a far better default for legal /
    # office documents than the previous psm 3 / psm 11.
    return "--oem 1 --psm 6"


def _cover_page_configs() -> List[str]:
    """Configs tried on cover pages; best-confidence wins."""
    if not settings.OCR_TRY_MULTIPLE_PSM:
        return [_default_config()]
    # psm 6: uniform block of text (good when title & parties are stacked).
    # psm 4: assumes a single column of variable-sized text (catches big
    #        centred headings where psm 6 sometimes merges lines).
    # psm 11: sparse text without block structure (useful fallback for
    #         scattered stamps / seals / hand-stamped cover pages).
    return ["--oem 1 --psm 6", "--oem 1 --psm 4", "--oem 1 --psm 11"]


def _tesseract_lang() -> str:
    return (settings.OCR_LANGUAGE or "eng").strip() or "eng"


# ---------------------------------------------------------------------------
# Image preprocessing
# ---------------------------------------------------------------------------


def _deskew_image(image: Image.Image) -> Image.Image:
    """Try to straighten a rotated scan using Tesseract's orientation detector."""
    if not settings.OCR_DESKEW:
        return image
    try:
        # image_to_osd is fast and only needs low-res input. Feed a copy so
        # the main OCR pass still sees our full-res preprocessed image.
        probe = image.copy()
        probe.thumbnail((1500, 1500))
        osd = pytesseract.image_to_osd(probe)
        m = re.search(r"Rotate: (\d+)", osd or "")
        if m:
            rotate_by = int(m.group(1)) % 360
            if rotate_by:
                # PIL rotates counter-clockwise; OSD says how much to rotate
                # the page by clockwise to make text upright.
                return image.rotate(-rotate_by, expand=True, fillcolor="white")
    except Exception:
        pass
    return image


def preprocess_image_for_ocr(image: Image.Image) -> Image.Image:
    """Improve Tesseract accuracy: grayscale, autocontrast, upscale if tiny."""
    if image.mode != "RGB":
        image = image.convert("RGB")
    image = _deskew_image(image)
    gray = image.convert("L")
    gray = ImageOps.autocontrast(gray, cutoff=2)
    w, h = gray.size
    if w < 1200 and h < 1600:
        scale = min(2.0, 2000 / max(w, h))
        if scale > 1.01:
            nw, nh = int(w * scale), int(h * scale)
            gray = gray.resize((nw, nh), Image.Resampling.LANCZOS)
    return gray


# ---------------------------------------------------------------------------
# Post-OCR text normalization
# ---------------------------------------------------------------------------

_LETTER_SPACED_RE = re.compile(r"(?:\b[A-Za-z]\s){2,}[A-Za-z]\b")

# Tesseract frequently reads stylised bold / italic letter strokes as stray
# "+", "|" or "\" characters, producing names like "Jajan+t+" or "Sh|ri" where
# the real letters were "Jayant" / "Shri". These characters never appear
# legitimately *inside* a word, so strip them when they sit between letters.
_INTRA_WORD_NOISE_RE = re.compile(r"(?<=[A-Za-z])[+|\\](?=[A-Za-z])")
# "Jajan+t+" or "name+" — trailing noise right after a letter, at a word boundary.
_TRAILING_NOISE_RE = re.compile(r"(?<=[A-Za-z])[+|\\]+(?=\s|$|[,.;:!?)\]}'\"]|$)")


def _collapse_letter_spaced(match: re.Match) -> str:
    seq = match.group(0)
    letters = [p for p in seq.split(" ") if p]
    if all(len(t) == 1 and t.isalpha() for t in letters):
        return "".join(letters)
    return seq


def _strip_intra_word_noise(text: str) -> str:
    """Remove stray +|\\ noise inside/attached to alphabetic tokens."""
    text = _INTRA_WORD_NOISE_RE.sub("", text)
    text = _TRAILING_NOISE_RE.sub("", text)
    return text


def normalize_ocr_text(text: str) -> str:
    """Clean common OCR artefacts. Safe to run on any page output."""
    if not text:
        return ""
    # Collapse `S H R I   R A M` -> `SHRI RAM`.
    text = _LETTER_SPACED_RE.sub(_collapse_letter_spaced, text)
    # Strip stray +|\ stroke-noise inside words.
    text = _strip_intra_word_noise(text)
    # Normalize whitespace inside lines, keep blank lines between paragraphs.
    out_lines = []
    for raw in text.split("\n"):
        line = re.sub(r"[ \t]+", " ", raw).strip()
        out_lines.append(line)
    text = "\n".join(out_lines)
    # Trim excessive blank lines.
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def clean_name_value(value: str) -> str:
    """
    Apply the safest subset of OCR cleanups to a string that is expected to be
    a *name* (party, title, party label, etc.). This is stricter than
    ``normalize_ocr_text`` because names must be whitespace-compact.

    - Strips stray +|\\ inside/attached to alpha tokens.
    - Collapses letter-spaced sequences.
    - Trims trailing punctuation left over from mid-line extraction.
    - Preserves hyphens, apostrophes, periods in initials, and ``&``.
    """
    if not value:
        return ""
    s = str(value).strip()
    s = _LETTER_SPACED_RE.sub(_collapse_letter_spaced, s)
    s = _strip_intra_word_noise(s)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.strip(" ,;:-_|/\\")
    return s


# ---------------------------------------------------------------------------
# Core OCR
# ---------------------------------------------------------------------------


def _ocr_with_config(image: Image.Image, config: str, lang: Optional[str] = None) -> str:
    return (
        pytesseract.image_to_string(
            image,
            lang=lang or _tesseract_lang(),
            config=config,
        )
        or ""
    )


def _ocr_with_confidence(
    image: Image.Image, config: str, lang: Optional[str] = None
) -> tuple[str, float]:
    """Run OCR and also report mean word confidence (0-100). Used to pick PSMs."""
    try:
        data = pytesseract.image_to_data(
            image,
            lang=lang or _tesseract_lang(),
            config=config,
            output_type=pytesseract.Output.DICT,
        )
        confs: List[float] = []
        words: List[str] = []
        for conf, word in zip(data.get("conf", []), data.get("text", [])):
            try:
                c = float(conf)
            except Exception:
                continue
            if c <= 0:
                continue
            w = (word or "").strip()
            if not w:
                continue
            confs.append(c)
            words.append(w)
        text = " ".join(words)
        mean_conf = (sum(confs) / len(confs)) if confs else 0.0
        return text, mean_conf
    except Exception:
        return _ocr_with_config(image, config, lang), 0.0


def run_ocr_on_pil(image: Image.Image, lang: Optional[str] = None) -> str:
    processed = preprocess_image_for_ocr(image)
    raw = _ocr_with_config(processed, _default_config(), lang)
    return normalize_ocr_text(raw)


def run_ocr_cover_page(image: Image.Image, lang: Optional[str] = None) -> str:
    """
    OCR for cover-style pages: try multiple PSMs, keep the highest-confidence
    output. This matters for party names / case titles rendered as stylised
    centred blocks that psm 3 / psm 11 scatter into noise.
    """
    processed = preprocess_image_for_ocr(image)
    best_text = ""
    best_score = -1.0
    for cfg in _cover_page_configs():
        text, conf = _ocr_with_confidence(processed, cfg, lang)
        # Slight bias: very short outputs are probably wrong even at high
        # confidence, so weight by length too.
        length_bonus = min(200, len(text.strip())) / 200.0
        score = conf + 15.0 * length_bonus
        if score > best_score:
            best_score = score
            best_text = text
    return normalize_ocr_text(best_text)


# ---------------------------------------------------------------------------
# Page-level decisions + merging
# ---------------------------------------------------------------------------


def _page_area(page: fitz.Page) -> float:
    r = page.rect
    return float(r.width * r.height)


def page_needs_fullpage_ocr(native_text: str, page: fitz.Page) -> bool:
    """Decide if we should rasterize the full page and run OCR."""
    t = (native_text or "").strip()
    if not t:
        return True

    area = _page_area(page)
    min_chars = int(settings.OCR_MIN_NATIVE_CHARS)
    if len(t) < min_chars and area > 120_000:
        return True

    wc = len(t.split())
    if wc < 14 and len(t) < 500 and area > 100_000:
        return True

    alnum = sum(1 for c in t if c.isalnum())
    if len(t) >= 20 and alnum / len(t) < 0.12:
        return True

    return False


def merge_native_and_ocr(native: str, ocr: str) -> str:
    """Combine PyMuPDF text with OCR; avoid duplicating near-identical content."""
    n, o = (native or "").strip(), (ocr or "").strip()
    if not o:
        return native or ""
    if not n:
        return o

    ratio = SequenceMatcher(None, n, o).ratio()
    if ratio > 0.9:
        return native
    short, long = (n, o) if len(n) <= len(o) else (o, n)
    if len(short) > 30 and short in long:
        return long

    return f"{native.rstrip()}\n\n[Scanned content]\n{o}"


def ocr_embedded_images(
    doc: fitz.Document, page: fitz.Page, page_index: int
) -> str:
    """OCR bitmaps/XObjects embedded in the page (figures, stamps, pasted scans)."""
    parts: List[str] = []
    try:
        for img_index, img in enumerate(page.get_images(full=True)):
            try:
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image = Image.open(io.BytesIO(image_bytes))
                if image.mode != "RGB":
                    image = image.convert("RGB")
                ocr_text = run_ocr_on_pil(image)
                if ocr_text.strip():
                    parts.append(
                        f"[Embedded image {img_index + 1} on page {page_index + 1}]\n"
                        f"{ocr_text.strip()}"
                    )
            except Exception:
                continue
    except Exception:
        pass
    return "\n\n".join(parts).strip()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def extract_pdf_page_texts(
    file_content: bytes,
    abort_guard: Optional[Callable[[], None]] = None,
    progress_callback: Optional[Callable[[int, int], None]] = None,
) -> List[str]:
    """
    Extract text per page: native PyMuPDF text + full-page OCR when needed +
    OCR for embedded images. Order matches page indices (0-based).

    If ``abort_guard`` is set, it is invoked before each page; it may raise
    :class:`app.utils.processing_abort.ProcessingAborted`.

    If ``progress_callback`` is set, it is invoked AFTER each page is
    processed as ``progress_callback(pages_done, total_pages)``. Exceptions
    raised by the callback are swallowed (progress reporting must never
    break extraction).
    """

    def _report(done: int, total: int) -> None:
        if progress_callback is None:
            return
        try:
            progress_callback(done, total)
        except Exception as cb_err:
            print(f"  ⚠️ OCR progress callback failed (ignored): {cb_err}")

    if not settings.OCR_ENABLED:
        doc = fitz.open(stream=file_content, filetype="pdf")
        try:
            out: List[str] = []
            total = len(doc)
            for i in range(total):
                if abort_guard:
                    abort_guard()
                t = (doc[i].get_text() or "").strip() or (
                    f"[Page {i + 1}: no extractable text]"
                )
                out.append(normalize_ocr_text(t))
                _report(i + 1, total)
            return out
        finally:
            doc.close()

    body_dpi = max(72, int(settings.OCR_DPI or 300))
    cover_dpi = max(body_dpi, int(settings.OCR_COVER_PAGE_DPI or body_dpi))
    cover_count = max(0, int(settings.OCR_COVER_PAGES or 0))
    always_fullpage = settings.OCR_ALWAYS_FULLPAGE

    doc = fitz.open(stream=file_content, filetype="pdf")

    # Auto-escalate to full-page OCR for PDFs that are almost entirely scanned.
    #
    # Why: Previously we relied on page_needs_fullpage_ocr() per-page, which
    # uses thresholds like "native text < 72 chars". But some scanned PDFs
    # have a handful of native-text artefacts on inner pages (page numbers,
    # headers, a few garbled characters) that push past the threshold — so
    # we skipped OCR on pages that were actually unreadable without it.
    # Those pages then never made it into Qdrant, which is exactly the
    # failure mode behind "summary misses the grounds of cruelty": the
    # grounds pages looked fine to page_needs_fullpage_ocr because of a few
    # header artefacts, so they got stored as 30-char native snippets
    # instead of real OCR text.
    #
    # Detection: sample every page's native text length. If the average is
    # below ~250 chars AND no single page has >1500 chars of native text,
    # we assume the whole document is scanned and force full-page OCR on
    # every page. Documents that are already text-rich are untouched.
    try:
        _native_lens: List[int] = []
        for _i in range(len(doc)):
            try:
                _native_lens.append(len((doc[_i].get_text() or "").strip()))
            except Exception:
                _native_lens.append(0)
        auto_fullpage = False
        if _native_lens:
            _avg = sum(_native_lens) / len(_native_lens)
            _max = max(_native_lens)
            if _avg < 250 and _max < 1500:
                auto_fullpage = True
                print(
                    f"  🛈 Auto full-page OCR: scanned-only PDF detected "
                    f"(avg native chars/page={_avg:.0f}, max={_max})"
                )
        if auto_fullpage:
            always_fullpage = True
    except Exception as _scan_err:
        print(f"  ⚠️ Scanned-PDF auto-detection failed: {_scan_err}")

    pages_out: List[str] = []
    try:
        total = len(doc)
        for i in range(total):
            if abort_guard:
                abort_guard()
            page = doc[i]
            native = page.get_text() or ""
            is_cover = i < cover_count

            ocr_full = ""
            run_fullpage = (
                always_fullpage or is_cover or page_needs_fullpage_ocr(native, page)
            )
            if run_fullpage:
                try:
                    dpi = cover_dpi if is_cover else body_dpi
                    pix = page.get_pixmap(dpi=dpi)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    if is_cover:
                        ocr_full = run_ocr_cover_page(img)
                    else:
                        ocr_full = run_ocr_on_pil(img)
                except Exception as ex:
                    print(f"  ⚠️ Full-page OCR failed on page {i + 1}: {ex}")

            combined = merge_native_and_ocr(normalize_ocr_text(native), ocr_full)

            embedded = ocr_embedded_images(doc, page, i)
            if embedded:
                combined = (
                    (combined + "\n\n" + embedded).strip()
                    if combined.strip()
                    else embedded
                )

            if not combined.strip():
                combined = f"[Page {i + 1}: no extractable text]"
            pages_out.append(combined)
            _report(i + 1, total)
    finally:
        doc.close()

    return pages_out
