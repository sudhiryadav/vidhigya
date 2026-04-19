/**
 * Central redaction helpers so structured or string logs cannot leak secrets.
 * Used by RedactingLogger and safe to import anywhere when building log payloads.
 */

const REDACTED = '[REDACTED]';

const SENSITIVE_KEY =
  /^(?:password|passwd|pwd|secret|token|api_?key|apikey|authorization|auth|bearer|jwt|cookie|set-cookie|access_?key|secret_?access|private_?key|qdrant_?api_?key|redis_?password|aws_?secret|client_?secret)$/i;

/** Keys whose values should always be redacted in nested objects */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY.test(key);
}

export function redactString(input: string): string {
  if (!input) return input;

  let s = input;

  // SQL / NoSQL URLs: hide userinfo (password)
  s = s.replace(
    /(\/\/)([^/:@]+):([^@/]+)(@)/g,
    (_, slash: string, user: string, _pwd: string, at: string) =>
      `${slash}${user}:${REDACTED}${at}`,
  );

  // Bearer tokens
  s = s.replace(/\bBearer\s+[\w.-]+/gi, `Bearer ${REDACTED}`);

  // AWS access key id pattern
  s = s.replace(/\bAKIA[0-9A-Z]{16}\b/g, REDACTED);

  // JWT-like (three base64url segments)
  s = s.replace(
    /\beyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\b/g,
    REDACTED,
  );

  // api_key=..., token=... in URLs or query strings
  s = s.replace(
    /([?&](?:api[_-]?key|token|secret|password|access[_-]?token))=([^&\s]+)/gi,
    `$1=${REDACTED}`,
  );

  return s;
}

export function redactDeep<T>(value: T, depth = 0): T {
  if (depth > 12) return REDACTED as T;
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactString(value) as T;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (value instanceof Error) {
    const e = new Error(redactString(value.message));
    e.name = value.name;
    e.stack = value.stack ? redactString(value.stack) : value.stack;
    return e as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactDeep(item, depth + 1)) as T;
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (isSensitiveKey(k)) {
        out[k] = REDACTED;
      } else {
        out[k] = redactDeep(v, depth + 1);
      }
    }
    return out as T;
  }

  return value;
}

export function redactUnknown(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Error) return redactDeep(value);
  if (Array.isArray(value)) return redactDeep(value);
  if (typeof value === 'object') return redactDeep(value);
  return value;
}
