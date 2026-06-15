export interface SanitizationFinding {
  pattern: string;
  category: "api_key" | "pii" | "private_prompt" | "credential" | "path" | "other";
  redacted: boolean;
  matchCount: number;
}

export interface SanitizationReport {
  passed: boolean;
  findings: SanitizationFinding[];
  redactedText: string;
  summary: string;
}

/** Pattern-based redaction stubs — phase 2+ adds OCR/frame inspection. */
const REDACTION_PATTERNS: Array<{
  name: string;
  category: SanitizationFinding["category"];
  regex: RegExp;
  replacement: string;
}> = [
  {
    name: "openai_api_key",
    category: "api_key",
    regex: /\bsk-[A-Za-z0-9]{20,}\b/g,
    replacement: "[REDACTED_API_KEY]",
  },
  {
    name: "generic_api_key",
    category: "api_key",
    regex: /\b(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}['"]?/gi,
    replacement: "api_key=[REDACTED]",
  },
  {
    name: "bearer_token",
    category: "credential",
    regex: /\bBearer\s+[A-Za-z0-9_\-\.]{20,}\b/gi,
    replacement: "Bearer [REDACTED]",
  },
  {
    name: "jwt",
    category: "credential",
    regex: /\beyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\b/g,
    replacement: "[REDACTED_JWT]",
  },
  {
    name: "email",
    category: "pii",
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: "[REDACTED_EMAIL]",
  },
  {
    name: "phone",
    category: "pii",
    regex: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: "[REDACTED_PHONE]",
  },
  {
    name: "private_prompt_marker",
    category: "private_prompt",
    regex: /(?:system prompt|private prompt|vault contents?)[:\s][\s\S]{0,200}/gi,
    replacement: "[REDACTED_PRIVATE_PROMPT]",
  },
  {
    name: "home_path",
    category: "path",
    regex: /\/Users\/[A-Za-z0-9._-]+\//g,
    replacement: "/Users/[REDACTED]/",
  },
  {
    name: "env_secret",
    category: "credential",
    regex: /\b(?:SUPABASE|YOUTUBE|OPENAI|ANTHROPIC|X_BEARER)[_A-Z]*\s*=\s*\S+/g,
    replacement: "[REDACTED_ENV]",
  },
];

export function sanitizeText(input: string): SanitizationReport {
  let redactedText = input;
  const findings: SanitizationFinding[] = [];

  for (const pattern of REDACTION_PATTERNS) {
    const matches = input.match(pattern.regex);
    const matchCount = matches?.length ?? 0;
    if (matchCount > 0) {
      findings.push({
        pattern: pattern.name,
        category: pattern.category,
        redacted: true,
        matchCount,
      });
      redactedText = redactedText.replace(pattern.regex, pattern.replacement);
    }
  }

  const passed = findings.length === 0;
  return {
    passed,
    findings,
    redactedText,
    summary: passed
      ? "No sensitive patterns detected"
      : `Redacted ${findings.reduce((n, f) => n + f.matchCount, 0)} match(es) across ${findings.length} pattern(s)`,
  };
}

/** Stub for frame/subtitle/log inspection before render. */
export function inspectCaptureBundle(bundle: {
  frames?: string[];
  subtitles?: string;
  logs?: string;
}): SanitizationReport {
  const combined = [
    ...(bundle.frames ?? []),
    bundle.subtitles ?? "",
    bundle.logs ?? "",
  ].join("\n");
  return sanitizeText(combined);
}
