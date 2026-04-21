"""
Generic document-profile extraction.

A document profile is a domain-agnostic summary of what a file is about:
who/what it concerns (parties, subjects, entities), its type, identifying
numbers/dates/amounts, and a short human-readable summary.

Why this exists
---------------
Plain vector RAG fails for queries like "brief me about the uploaded document"
or "who are the parties". A user-friendly 100-word summary of a 271-page
scanned filing has almost zero semantic overlap with a cover page — so the
cover page is never retrieved, and the LLM either hallucinates or says
"the document does not contain that information".

The profile is computed ONCE at upload time and stored three ways in Qdrant:
  1. As a dedicated "header" chunk (``chunk_kind="summary"``) that can be
     retrieved via filter on summary-intent queries.
  2. As top-level payload fields (``document_title``, ``document_type``,
     ``document_summary``, ``parties``, ``key_identifiers``, ``key_topics``)
     on every chunk — useful for faceted UI and future filtering.
  3. As a short ``[type: title]`` prefix prepended to every chunk's content
     so that whichever chunk vector search returns, the LLM still sees which
     document / who / what it is talking about.

The profile is produced by calling the Modal ``vidhigya-extract-metadata``
endpoint when configured; otherwise a regex heuristic runs so upload never
blocks or fails on metadata extraction. The heuristic understands English
*and* Devanagari (Hindi) cover-page patterns so Indian family-court filings
degrade gracefully even without a live LLM extractor.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List, Optional

import requests

from app.core.config import settings


ProfileDict = Dict[str, Any]


def empty_profile() -> ProfileDict:
    return {
        "document_type": "",
        "document_title": "",
        "summary": "",
        "parties": [],
        "key_identifiers": [],
        "key_topics": [],
    }


# ---------------------------------------------------------------------------
# Text normalisation helpers
# ---------------------------------------------------------------------------

_DEVANAGARI_RANGE = (0x0900, 0x097F)


def _is_devanagari(ch: str) -> bool:
    if not ch:
        return False
    code = ord(ch)
    return _DEVANAGARI_RANGE[0] <= code <= _DEVANAGARI_RANGE[1]


def _is_letter(ch: str) -> bool:
    if not ch:
        return False
    if ch.isalpha():
        return True
    return _is_devanagari(ch)


def _clean_line(s: str) -> str:
    s = re.sub(r"[ \t]+", " ", s).strip()
    return s


def _collapse_letter_spaced(text: str) -> str:
    """Turn OCR'd 'S H R I   R A M' into 'SHRI RAM' where appropriate."""

    def _join(match: re.Match) -> str:
        seq = match.group(0)
        letters = [p for p in seq.split(" ") if p]
        if all(len(t) == 1 and t.isalpha() for t in letters):
            return "".join(letters)
        return seq

    return re.sub(r"(?:\b[A-Za-z]\s){2,}[A-Za-z]\b", _join, text)


# ---------------------------------------------------------------------------
# Junk detection — reject OCR gibberish before it lands in the profile
# ---------------------------------------------------------------------------
#
# The heuristic below rejects strings like ``oe [6 Fa`` or
# ``ae ‘ ee a श्र ps (ft tt 221 i rs 42`` which are what you get when OCR
# tries to read a torn/stamped scanned page. Accepting those as a "title" or
# a "party name" poisons every downstream summary because the LLM then either
# echoes the gibberish verbatim or invents plausible-looking substitutes.


# Stoplist: things that are NEVER a case-party in a legal document, but often
# show up on later pages / signature blocks and get mis-extracted as parties.
_PARTY_STOPLIST_RE = re.compile(
    r"^(?:"
    r"presiding\s+officer|"
    r"counsel(?:\s+for)?|"
    r"advocate|"
    r"judge|"
    r"registrar|"
    r"stamp|"
    r"seal|"
    r"court\s+fee|"
    r"notary|"
    r"witness|"
    r"translator|"
    r"oath\s+commissioner"
    r")\b",
    flags=re.IGNORECASE,
)


def _looks_like_junk(s: Optional[str]) -> bool:
    """
    Return True when ``s`` looks like OCR gibberish rather than a real
    natural-language value (title / party / topic / document_type).

    This check is intended for *names and descriptive text*. It is deliberately
    NOT applied to structured identifiers (dates, case numbers, amounts)
    because those legitimately have few letters.

    Heuristic checks:
    - At least one whitespace-separated token must be a "real word" — 3+
      consecutive Latin letters, or 4+ Devanagari codepoints (so a single
      conjunct like ``श्र`` does not count, but ``सुरेश`` / ``जोशी`` do).
      Rejects ``oe [6 Fa`` and ``ae ‘ ee a श्र ps (ft tt 221 i rs 42``.
    - No run of 3+ consecutive unusual punctuation / symbols. Rejects
      ``Bis $6 MN (4:44 Bis $6 MN``.
    - If there are >=4 tokens, at most 40% may be single-character. Rejects
      alphabet-soup like ``a b c d e f g``.
    """
    if s is None:
        return True
    text = str(s).strip()
    if len(text) < 3:
        return True

    tokens = text.split()
    real_word_count = 0
    for tok in tokens:
        if re.search(r"[A-Za-z]{3,}", tok):
            real_word_count += 1
            continue
        deva = sum(1 for c in tok if _is_devanagari(c))
        if deva >= 4:
            real_word_count += 1

    if real_word_count == 0:
        return True

    # A title / name with multiple tokens but only ONE real word is almost
    # always OCR garbage (e.g. ``हे KS jee oa`` — 4 tokens, 1 real word).
    # Require >=50% of tokens to be real words when there are >=3 tokens,
    # or >=1 real word for 1-2 token strings.
    if len(tokens) >= 3 and real_word_count / len(tokens) < 0.5:
        return True

    if re.search(r"[^\w\s\u0900-\u097F'\-.,&/()]{3,}", text):
        return True

    if len(tokens) >= 4:
        single = sum(1 for t in tokens if len(t) == 1)
        if single / len(tokens) > 0.4:
            return True

    return False


def _strip_party_role_prefix(value: str) -> str:
    """Drop a leading role label (``Petitioner: ``) so stoplist check sees the name."""
    return re.sub(
        r"^(?:petitioner|respondent|plaintiff|defendant|appellant|complainant|"
        r"vendor|client|buyer|seller|bill to|patient|parties|opposing party|"
        r"प्रार्थी|प्रतिप्रार्थी|प्रतिवादी|अनावेदक|आवेदक|वादी|अभियोगी)\s*[:\-–]\s*",
        "",
        value,
        flags=re.IGNORECASE,
    ).strip()


def _is_stoplisted_party(value: str) -> bool:
    name = _strip_party_role_prefix(value)
    return bool(_PARTY_STOPLIST_RE.match(name))


def _clean_string_field(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    v = unicodedata.normalize("NFKC", value).strip()
    v = re.sub(r"\s+", " ", v)
    return v


def _clean_list_field(
    values: Any, *, drop_junk: bool, drop_stoplist: bool = False, max_items: int = 20
) -> List[str]:
    if not isinstance(values, list):
        return []
    out: List[str] = []
    seen: set[str] = set()
    for raw in values:
        v = _clean_string_field(raw)
        if not v:
            continue
        if drop_junk and _looks_like_junk(v):
            continue
        if drop_stoplist and _is_stoplisted_party(v):
            continue
        key = v.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(v)
        if len(out) >= max_items:
            break
    return out


def sanitise_profile(profile: ProfileDict) -> ProfileDict:
    """
    Apply OCR-junk rejection uniformly. Called on both the Modal result and
    the regex heuristic result so bad values never reach Qdrant.
    """
    out = empty_profile()
    title = _clean_string_field(profile.get("document_title"))
    if title and not _looks_like_junk(title):
        out["document_title"] = title
    dtype = _clean_string_field(profile.get("document_type"))
    if dtype and not _looks_like_junk(dtype):
        out["document_type"] = dtype
    summary = _clean_string_field(profile.get("summary"))
    # Keep summary even if some tokens look junky — we only reject if the
    # whole thing fails the junk check AND is short (a long mixed paragraph
    # is fine and still informative).
    if summary and (len(summary) > 80 or not _looks_like_junk(summary)):
        out["summary"] = summary
    out["parties"] = _clean_list_field(
        profile.get("parties"), drop_junk=True, drop_stoplist=True, max_items=8
    )
    # Identifiers are dates / numbers / citations — low letter ratio is NORMAL,
    # so we skip junk-checking and only dedup/clean.
    out["key_identifiers"] = _clean_list_field(
        profile.get("key_identifiers"), drop_junk=False, max_items=12
    )
    out["key_topics"] = _clean_list_field(
        profile.get("key_topics"), drop_junk=True, max_items=8
    )
    return out


# ---------------------------------------------------------------------------
# Regex heuristic (English + Hindi)
# ---------------------------------------------------------------------------


# English role markers on a cover page. The capture group is the name.
_EN_PARTY_PATTERNS: List[tuple[str, str]] = [
    (r"(?i)\bpetitioner[s]?\b[:\-\s]+([^\n]+)", "Petitioner"),
    (r"(?i)\brespondent[s]?\b[:\-\s]+([^\n]+)", "Respondent"),
    (r"(?i)\bplaintiff[s]?\b[:\-\s]+([^\n]+)", "Plaintiff"),
    (r"(?i)\bdefendant[s]?\b[:\-\s]+([^\n]+)", "Defendant"),
    (r"(?i)\bappellant[s]?\b[:\-\s]+([^\n]+)", "Appellant"),
    (r"(?i)\bcomplainant[s]?\b[:\-\s]+([^\n]+)", "Complainant"),
    (r"(?i)\bvendor\b[:\-\s]+([^\n]+)", "Vendor"),
    (r"(?i)\bclient\b[:\-\s]+([^\n]+)", "Client"),
    (r"(?i)\bbuyer\b[:\-\s]+([^\n]+)", "Buyer"),
    (r"(?i)\bseller\b[:\-\s]+([^\n]+)", "Seller"),
    (r"(?i)\bbill\s*to\b[:\-\s]+([^\n]+)", "Bill to"),
    (r"(?i)\bpatient\b[:\-\s]+([^\n]+)", "Patient"),
    (r"(?i)\bbetween\b[:\-\s]+([^\n]+?)\s+\band\b\s+([^\n]+)", "Parties"),
    (r"(?i)\bversus\b\s+([^\n]+)", "Opposing party"),
    (r"(?i)\b(?:v\.?|v/s|vs\.?)\s+([^\n]+)", "Opposing party"),
]


# Age / occupation markers in Hindi cover pages. These are reliable "end
# anchors" for a party's name block because Indian family-court petitions
# follow the template:  <name>  उम्र/आयु <N> वर्ष , व्यवसाय - <job> , निवासी - <addr>
# NOTE: The trailing unit (``वर्ष`` / ``साल`` / ``years``) is OPTIONAL because
# Tesseract frequently mis-reads Devanagari suffixes after digits (e.g.
# ``आयु - 36 ay करीब`` where ``वर्ष`` was garbled to ``ay``). The dash block
# allows 0-3 dashes / en-dashes so OCR variations like ``आयु -- 36 वर्ष`` or
# ``आयु – 36`` also anchor correctly.
_HI_AGE_ANCHOR_RE = re.compile(
    r"(?:उम्र|आयु|ऊमर)\s*[-–]{0,3}\s*\d{1,3}(?:\s*(?:वर्ष|साल|year|years|yrs?))?",
    flags=re.UNICODE,
)


def _is_devanagari_digit(ch: str) -> bool:
    return bool(ch) and 0x0966 <= ord(ch) <= 0x096F


def _is_name_like_deva_token(tok: str) -> bool:
    """A Devanagari token that looks like it could be part of a person's name."""
    if not tok:
        return False
    letters = [c for c in tok if _is_devanagari(c) and not _is_devanagari_digit(c)]
    # At least 2 Devanagari letters AND not a pure-digit token.
    return len(letters) >= 2 and not all(_is_devanagari_digit(c) for c in tok)


def _extract_hindi_party_name(block: str) -> str:
    """
    Given the slice of text leading up to an age marker, return the most
    likely Devanagari full name (2-6 consecutive Devanagari words).

    Strategy: walk backwards from the end of the block collecting tokens that
    look like Devanagari name particles (including honorifics / relations
    like ``श्रीमती`` / ``पति``), stopping at the first punctuation or
    non-Devanagari gap longer than one space. Pure Devanagari digit tokens
    (``४४०`` etc.) are treated as non-name breakers.
    """
    if not block:
        return ""
    # Tokens in source order — we'll scan from the right.
    tokens = re.findall(
        r"[\u0900-\u097F][\u0900-\u097F\u200C\u200D]+|[A-Za-z][A-Za-z\.]+",
        block,
    )
    trailing: List[str] = []
    for t in reversed(tokens):
        if _is_name_like_deva_token(t):
            trailing.append(t)
            if len(trailing) >= 8:
                break
        else:
            if trailing:
                break
    trailing.reverse()
    # Drop stray 1-2 char Devanagari tokens from the head/tail of the run —
    # those are almost always OCR fragments like ``पा`` from a cut word.
    while trailing and sum(1 for c in trailing[0] if _is_devanagari(c)) < 3:
        trailing.pop(0)
    while trailing and sum(1 for c in trailing[-1] if _is_devanagari(c)) < 3:
        trailing.pop()
    if not trailing:
        return ""
    candidate = " ".join(trailing)
    if _looks_like_junk(candidate):
        return ""
    return candidate


def _extract_hindi_parties(text: str) -> List[str]:
    """
    Pull up to 2 parties (petitioner, then respondent) from a Hindi family-
    court cover page using the age-anchor pattern.
    """
    parties: List[str] = []
    labels = ["Petitioner", "Respondent"]
    last_end = 0
    for idx, m in enumerate(_HI_AGE_ANCHOR_RE.finditer(text)):
        start = m.start()
        # Look at the 200 chars preceding the age marker (since the marker
        # comes right after the name + age).
        lookback_start = max(last_end, start - 240)
        block = text[lookback_start:start]
        name = _extract_hindi_party_name(block)
        if name:
            role = labels[idx] if idx < len(labels) else f"Party {idx + 1}"
            parties.append(f"{role}: {name}")
        last_end = m.end()
        if len(parties) >= 2:
            break
    return parties


def _extract_section_citations(text: str) -> List[str]:
    """
    Pull section citations like ``Section 13(1)(ia)`` or ``धारा 13(1)(ia)(ib)``
    plus the Act they belong to (``Hindu Marriage Act, 1955`` / ``हिंदू विवाह
    अधिनियम, 1955``).
    """
    out: List[str] = []
    for m in re.finditer(
        r"(?:section|धारा|सेक्शन|sec\.?)\s*"
        r"(\d{1,4}(?:\([^\)]{0,15}\)){0,4})",
        text,
        flags=re.IGNORECASE,
    ):
        out.append(f"Section {m.group(1)}")
        if len(out) >= 4:
            break
    # Act references — English and Hindi phrasings.
    for pat in (
        r"([A-Z][A-Za-z ]{5,60}?\s+Act,?\s*(?:19|20)\d{2})",
        r"((?:हिंदू|भारतीय|विशेष|मुस्लिम|पारसी|ईसाई)[\u0900-\u097F ]{0,40}?(?:अधिनियम|कानून)[,\s]*\d{4})",
    ):
        for m in re.finditer(pat, text):
            val = _clean_line(m.group(1))
            if val and val not in out:
                out.append(val)
            if len(out) >= 8:
                break
    return out


def _extract_case_numbers(text: str) -> List[str]:
    """Best-effort capture of case/file/ref numbers in English and Hindi docs."""
    ids: List[str] = []
    patterns = [
        # English
        r"\b(?:case|matter|suit|petition|file|ref(?:erence)?|invoice|order|receipt|T\.?\s*P\.?|C\.?\s*A\.?|R\.?\s*F\.?\s*A\.?|W\.?\s*P\.?)\s*(?:no\.?|number|#)?\s*[:\-]?\s*[A-Za-z0-9/\-]+/\d{2,4}",
        r"\bW\.?P\.?\s*\(?[A-Z]{0,4}\)?\s*No\.?\s*\d+[/\-]\d{2,4}",
        r"\bC\.?[A-Z]{1,3}\.?\s*No\.?\s*\d+[/\-]\d{2,4}",
        r"\b(?:INV|PO|SO|GRN|DO)[- ]?\d{3,}",
        # Hindi — प्रकरण क्रमांक / वाद क्रमांक / याचिका क्रमांक
        r"(?:प्रकरण|वाद|याचिका|अपील)\s*(?:क्रमांक|नंबर|संख्या)\s*[:\-]?\s*\S{2,30}",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, flags=re.IGNORECASE):
            val = _clean_line(m.group(0))[:80]
            if val and val.lower() not in {x.lower() for x in ids}:
                ids.append(val)
            if len(ids) >= 6:
                break
    return ids


def _heuristic_profile(text: str, filename: Optional[str]) -> ProfileDict:
    """Regex-based fallback: no LLM, no network, always safe to run."""
    profile = empty_profile()
    if not text:
        if filename:
            profile["document_title"] = filename
        return profile

    excerpt = _collapse_letter_spaced(text[:8000])
    lines = [_clean_line(ln) for ln in excerpt.splitlines() if _clean_line(ln)]

    # Title: first non-trivial line that isn't itself OCR gibberish.
    for ln in lines[:20]:
        if 6 <= len(ln) <= 160 and not _looks_like_junk(ln):
            profile["document_title"] = ln
            break
    if not profile["document_title"] and filename:
        profile["document_title"] = filename

    # English role-label parties
    parties: List[str] = []
    for pat, role in _EN_PARTY_PATTERNS:
        for m in re.finditer(pat, excerpt):
            for g in m.groups():
                if g:
                    val = _clean_line(g)[:160]
                    if val and not _looks_like_junk(val):
                        parties.append(f"{role}: {val}")

    # Hindi age-anchor parties (runs on the full 8k excerpt, not just English).
    parties.extend(_extract_hindi_parties(excerpt))

    seen: set[str] = set()
    deduped: List[str] = []
    for p in parties:
        if _is_stoplisted_party(p):
            continue
        key = p.lower()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)
        if len(deduped) >= 8:
            break
    profile["parties"] = deduped

    # Identifiers + section citations + dates.
    ids: List[str] = []
    ids.extend(_extract_case_numbers(excerpt))
    ids.extend(_extract_section_citations(excerpt))
    for m in re.finditer(
        r"\b\d{1,2}[\-/ ](?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2})[\-/ ]\d{2,4}",
        excerpt,
        flags=re.IGNORECASE,
    ):
        val = _clean_line(m.group(0))
        if val and val.lower() not in {x.lower() for x in ids}:
            ids.append(val)
        if len(ids) >= 12:
            break
    for m in re.finditer(r"\b(?:Rs\.?|INR|USD|\$|€|₹)\s?[0-9][0-9,]*(?:\.[0-9]+)?", excerpt):
        val = _clean_line(m.group(0))
        if val and val.lower() not in {x.lower() for x in ids}:
            ids.append(val)
        if len(ids) >= 12:
            break
    profile["key_identifiers"] = ids[:12]

    # Summary: first ~2 meaningful paragraphs, compressed.
    joined = " ".join(lines[:30])
    profile["summary"] = joined[:600]

    return sanitise_profile(profile)


# ---------------------------------------------------------------------------
# Modal extractor
# ---------------------------------------------------------------------------


def _call_modal_extractor(text: str, filename: Optional[str]) -> Optional[ProfileDict]:
    """POST to the Modal vidhigya-extract-metadata endpoint. Returns None on any failure."""
    url = (settings.MODAL_EXTRACT_METADATA_URL or "").strip()
    if not url:
        print("[document_profile] Modal extractor SKIPPED: URL not configured")
        return None
    if not settings.METADATA_EXTRACTION_ENABLED:
        print("[document_profile] Modal extractor SKIPPED: METADATA_EXTRACTION_ENABLED=False")
        return None
    api_key = (
        settings.MODAL_API_KEY or settings.AI_SERVICE_API_KEY or ""
    ).strip()
    if not api_key:
        print("[document_profile] Modal extractor SKIPPED: no API key")
        return None

    timeout_s = int(settings.METADATA_EXTRACTION_TIMEOUT or 300)
    try:
        print(
            f"[document_profile] Modal extractor CALL: url={url} "
            f"text_chars={min(len(text), 20000)} timeout={timeout_s}s"
        )
        resp = requests.post(
            url,
            json={"text": text[:20000], "filename": filename or ""},
            headers={
                "Content-Type": "application/json",
                "X-API-Key": api_key,
            },
            timeout=timeout_s,
        )
        if resp.status_code != 200:
            print(
                f"[document_profile] Modal extractor FAILED status={resp.status_code}: "
                f"{resp.text[:300]}"
            )
            return None
        data = resp.json()
        profile = data.get("profile") if isinstance(data, dict) else None
        if not isinstance(profile, dict):
            print(
                f"[document_profile] Modal extractor FAILED: no profile in response "
                f"(keys={list(data.keys()) if isinstance(data, dict) else type(data)})"
            )
            return None
        merged = empty_profile()
        merged.update({k: v for k, v in profile.items() if k in merged})
        cleaned = sanitise_profile(merged)
        print(
            f"[document_profile] Modal extractor OK: type={cleaned.get('document_type')!r} "
            f"title={cleaned.get('document_title')!r} "
            f"parties={len(cleaned.get('parties') or [])} "
            f"ids={len(cleaned.get('key_identifiers') or [])}"
        )
        return cleaned
    except Exception as e:
        print(f"[document_profile] Modal extractor FAILED exception: {e}")
        return None


def extract_profile(text: str, filename: Optional[str] = None) -> ProfileDict:
    """
    Produce a document profile. Tries Modal LLM extractor first, falls back
    to the regex heuristic. The two results are merged so we keep anything
    Modal produced plus any fields Modal left empty that regex could fill.
    All output is run through :func:`sanitise_profile` so OCR gibberish never
    reaches Qdrant.
    """
    heuristic = _heuristic_profile(text or "", filename)

    modal_result = _call_modal_extractor(text or "", filename)
    if not modal_result:
        return heuristic

    merged = empty_profile()
    for key in merged:
        modal_val = modal_result.get(key)
        heur_val = heuristic.get(key)
        if isinstance(modal_val, list):
            merged[key] = modal_val if modal_val else (heur_val or [])
        else:
            merged[key] = modal_val if modal_val else (heur_val or "")
    return sanitise_profile(merged)


# ---------------------------------------------------------------------------
# Rendering helpers
# ---------------------------------------------------------------------------


def render_summary_chunk_text(profile: ProfileDict, filename: Optional[str] = None) -> str:
    """Human-readable, LLM-friendly rendering of the profile for storage + retrieval."""
    parts: List[str] = []
    title = profile.get("document_title") or (filename or "")
    if title:
        parts.append(f"DOCUMENT TITLE: {title}")
    doc_type = profile.get("document_type") or ""
    if doc_type:
        parts.append(f"DOCUMENT TYPE: {doc_type}")
    summary = profile.get("summary") or ""
    if summary:
        parts.append(f"SUMMARY: {summary}")
    parties = profile.get("parties") or []
    if parties:
        parts.append("PARTIES / SUBJECTS: " + "; ".join(parties))
    ids = profile.get("key_identifiers") or []
    if ids:
        parts.append("KEY IDENTIFIERS: " + "; ".join(ids))
    topics = profile.get("key_topics") or []
    if topics:
        parts.append("KEY TOPICS: " + ", ".join(topics))
    if filename:
        parts.append(f"FILENAME: {filename}")
    return "\n".join(parts).strip() or (filename or "Document")


def render_chunk_prefix(profile: ProfileDict, filename: Optional[str] = None) -> str:
    """
    Short (~120 char) header injected on every body chunk so the LLM
    always sees the document identity regardless of which chunk is retrieved.
    """
    title = profile.get("document_title") or (filename or "")
    doc_type = profile.get("document_type") or ""
    if title and doc_type:
        header = f"[{doc_type}: {title}]"
    elif title:
        header = f"[{title}]"
    elif doc_type:
        header = f"[{doc_type}]"
    else:
        return ""
    return header[:180]
