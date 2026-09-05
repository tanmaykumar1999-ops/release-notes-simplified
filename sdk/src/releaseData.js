const SYSTEM_PROMPT = `You are a developer education expert. Your job is to take official programming language release notes — which are often written in dense, spec-heavy technical language — and rewrite them so that a working developer can immediately understand what changed, why it matters, and how to use it.
 
Always respond with ONLY valid JSON matching this exact structure, with no markdown fences or extra text:
 
{
  "tagline": "One sentence plain-English summary of this release",
  "features": [
    {
      "title": "Short feature name",
      "summary": "2-3 sentences explaining what this is and why a dev would care",
      "example": "Optional: a short code snippet showing usage",
      "tag": "feature"
    }
  ],
  "deprecations": [
    {
      "title": "What is deprecated",
      "summary": "Why it was deprecated and what to use instead",
      "tag": "deprecation"
    }
  ],
  "migrationTips": [
    "Practical tip 1 for upgrading to this version",
    "Practical tip 2",
    "Practical tip 3"
  ]
}
 
Rules:
- Use plain English. Avoid ISO standard references, committee jargon, and spec numbers.
- Every feature summary must answer: what is it, why does it exist, when would I use it?
- Code examples should be minimal — 1-3 lines max, showing the most common use case.
- Migration tips should be concrete and actionable.
- Keep features to the most important 5-8 items. Do not list every minor change.
- tag must be one of: "feature", "deprecation", "removal", "fix", "migration"`;

// Fix: was a broken async arrow function that was never called or returned anything.
// Now a plain function that accepts a raw release object and returns the prompt string.
const buildUserPrompt = function (raw) {
  return `Here are the official release notes for ${raw.version} (released ${raw.publishedAt}):
${raw.rawContent}
Please simplify these into the JSON format described. Focus on what matters most to working developers.`;
};

// Fix: apiKey and model now read from env vars instead of being passed as arguments,
// since index.js already loads dotenv.
const simplifyWithClaude = async function (raw) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(raw),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  const textBlock = data.content.find((c) => c.type === "text");
  if (!textBlock) {
    throw new Error("No text content in Claude API response");
  }

  // Strip markdown fences if present
  const cleaned = textBlock.text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `Failed to parse Claude response as JSON: ${cleaned.slice(0, 200)}`
    );
  }

  return {
    tagline: parsed.tagline || "New release available.",
    features: parsed.features || [],
    deprecations: parsed.deprecations || [],
    migrationTips: parsed.migrationTips || [],
  };
};

module.exports = { simplifyWithClaude};