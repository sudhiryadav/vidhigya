/**
 * Normalizes POST /documents/search responses (and legacy array shapes) to a hit list.
 */
export interface DocumentSearchHit {
  document_id: string;
  document_title?: string;
  filename?: string;
  page_number?: number;
  document_category?: string;
  content?: string;
  score?: number;
  uploaded_by?: string;
  uploaded_at?: string;
  start_char?: number;
  end_char?: number;
  chunk_index?: number;
  file_type?: string;
}

export function extractDocumentSearchHits(raw: unknown): DocumentSearchHit[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw as DocumentSearchHit[];
  if (typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.results)) return r.results as DocumentSearchHit[];
  const data = r.data;
  if (data && typeof data === "object") {
    const inner = (data as Record<string, unknown>).results;
    if (Array.isArray(inner)) return inner as DocumentSearchHit[];
  }
  return [];
}

/** Qdrant cosine scores are often 0–1; display as percentage when ≤ 1. */
export function formatSearchHitScore(score: number | undefined): string {
  if (typeof score !== "number" || Number.isNaN(score)) return "—";
  const pct = score <= 1 ? score * 100 : score;
  return `${pct.toFixed(1)}%`;
}

/**
 * When the model echoes vector hits as JSON (legacy / edge cases), show plain text in the chat UI.
 */
export function formatDocumentAssistantAnswer(content: string): string {
  const t = content.trim();
  if (!t.startsWith("[")) return content;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return content;
    const first = parsed[0] as Record<string, unknown>;
    const looksLikeHit =
      typeof first?.content === "string" ||
      typeof first?.document_id === "string";
    if (!looksLikeHit) return content;
    const lines = parsed.slice(0, 8).map((item: unknown, i: number) => {
      const row = item as Record<string, unknown>;
      const excerpt = String(row.content ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 450);
      const suffix = String(row.content ?? "").length > 450 ? "…" : "";
      return `${i + 1}. Document: ${excerpt}${suffix}`;
    });
    return [
      "Here are the most relevant excerpts from your documents:",
      "",
      ...lines,
    ].join("\n");
  } catch {
    return content;
  }
}
