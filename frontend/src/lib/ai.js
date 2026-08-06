import Anthropic from '@anthropic-ai/sdk';
import { classificationSchema } from '@/lib/schemas/classification';

/**
 * SERVER-SIDE ONLY MODULE
 * ANTHROPIC_API_KEY is loaded strictly from server-side environment variables (process.env.ANTHROPIC_API_KEY).
 * It is NEVER exposed to the browser or prefixed with NEXT_PUBLIC_.
 * This module must NEVER be imported into client components ('use client').
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Strips markdown code block formatting (e.g. ```json ... ```) from model output string.
 * @param {string} rawText
 * @returns {string}
 */
function stripMarkdownFences(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();
  // Strip leading ```json or ``` and trailing ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return cleaned.trim();
}

/**
 * Builds system and user prompts for feedback classification.
 * @param {string} content - Feedback text to classify
 * @param {string[]} existingThemeNames - Existing workspace theme names to prefer
 * @returns {{ systemPrompt: string, userPrompt: string }}
 */
function buildClassificationPrompts(content, existingThemeNames = []) {
  const themeContext =
    Array.isArray(existingThemeNames) && existingThemeNames.length > 0
      ? `Existing workspace theme names available for reuse:\n${existingThemeNames.map((name) => `- "${name}"`).join('\n')}\n\nINSTRUCTION FOR THEMES: Prefer reusing existing theme names listed above when applicable to prevent creating near-duplicate themes. However, if none of the existing themes fit, you may introduce a genuinely new, concise theme name.`
      : `No existing themes currently exist in the workspace. Create concise, descriptive theme names.`;

  const systemPrompt = `You are an AI customer feedback classifier for Project LOOP.
Your job is to analyze raw feedback content and extract structured intelligence.

You MUST return ONLY a raw JSON object with NO preamble, NO conversational text, and NO markdown code fences.

The JSON response MUST adhere strictly to this schema:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": number between -1.0 and 1.0 (where -1.0 is extremely negative, 0.0 is neutral, and 1.0 is extremely positive),
  "themes": string[] (non-empty array of theme names, max 3-4 themes),
  "featureArea": string (main feature/product area referenced, e.g. "Authentication", "UI/UX", "Performance", "Billing", "Integrations", "Analytics", etc.),
  "rationale": string (brief, 1-2 sentence explanation of the sentiment and theme assignments)
}`;

  const userPrompt = `${themeContext}

Raw Feedback Content to classify:
"${content}"

Return ONLY valid JSON matching the specified format.`;

  return { systemPrompt, userPrompt };
}

/**
 * Safely parses a JSON string and validates it against classificationSchema Zod schema.
 * @param {string} jsonString
 * @returns {{ success: true, data: import('zod').infer<typeof classificationSchema> } | { success: false, error: string }}
 */
function tryParseAndValidate(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    const validated = classificationSchema.safeParse(parsed);
    if (!validated.success) {
      const formattedErrors = validated.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      return { success: false, error: formattedErrors };
    }
    return { success: true, data: validated.data };
  } catch (parseErr) {
    return {
      success: false,
      error: `JSON parse error: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON string'}`,
    };
  }
}

/**
 * Classifies feedback content into structured JSON using Claude AI.
 * 
 * @param {string} content - Raw feedback text to classify
 * @param {string[]} [existingThemeNames=[]] - List of existing theme names in caller's workspace
 * @returns {Promise<{ success: true, data: { sentiment: 'POS'|'NEU'|'NEG', sentimentScore: number, themes: string[], featureArea: string, rationale: string } } | { success: false, error: string }>}
 */
export async function classifyFeedback(content, existingThemeNames = []) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return {
      success: false,
      error: 'Feedback content must be a non-empty string',
    };
  }

  const { systemPrompt, userPrompt } = buildClassificationPrompts(
    content,
    existingThemeNames
  );

  const model = 'claude-sonnet-4-6';

  try {
    // Attempt 1: Primary API call
    const response1 = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText1 = response1.content?.[0]?.text || '';
    const cleanedText1 = stripMarkdownFences(rawText1);

    const parseResult1 = tryParseAndValidate(cleanedText1);
    if (parseResult1.success) {
      return { success: true, data: parseResult1.data };
    }

    // Attempt 2: Single Retry with stricter follow-up prompt reminding Claude to return valid JSON only
    const followUpUserPrompt = `Your previous output failed JSON validation with the following error:
${parseResult1.error}

Raw response previously received:
"${rawText1}"

Please re-classify the feedback below and return ONLY valid JSON matching the exact required schema with NO markdown fences or additional text:
"${content}"`;

    const response2 = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: rawText1 },
        { role: 'user', content: followUpUserPrompt },
      ],
    });

    const rawText2 = response2.content?.[0]?.text || '';
    const cleanedText2 = stripMarkdownFences(rawText2);

    const parseResult2 = tryParseAndValidate(cleanedText2);
    if (parseResult2.success) {
      return { success: true, data: parseResult2.data };
    }

    return {
      success: false,
      error: `Classification failed validation after 1 retry. Error: ${parseResult2.error}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown AI classification error',
    };
  }
}
