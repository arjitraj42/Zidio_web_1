import Anthropic from '@anthropic-ai/sdk';
import { classificationSchema } from '@/lib/schemas/classification';

/**
 * SERVER-SIDE ONLY MODULE
 * Supports both ANTHROPIC_API_KEY and GEMINI_API_KEY (Google Gemini).
 * Loaded strictly from server-side environment variables.
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * Strips markdown code block formatting (e.g. ```json ... ```) from model output string.
 */
function stripMarkdownFences(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return cleaned.trim();
}

/**
 * Builds system and user prompts for feedback classification.
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
 * Safely parses a JSON string and validates it against classificationSchema.
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
 * Calls Google Gemini API if GEMINI_API_KEY is configured.
 */
async function callGeminiAPI(systemPrompt, userPrompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Classifies feedback content into structured JSON using Gemini API or Claude AI.
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

  try {
    let rawText = '';

    // 1. Try Google Gemini API if GEMINI_API_KEY is set
    if (process.env.GEMINI_API_KEY) {
      rawText = await callGeminiAPI(systemPrompt, userPrompt);
    } 
    // 2. Otherwise try Anthropic Claude if ANTHROPIC_API_KEY is set
    else if (process.env.ANTHROPIC_API_KEY) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawText = response.content?.[0]?.text || '';
    }
    // 3. Fallback Heuristic Classifier if no AI keys are provided
    else {
      const lower = content.toLowerCase();
      let sentiment = 'NEU';
      let sentimentScore = 0.0;

      if (lower.includes('good') || lower.includes('great') || lower.includes('love') || lower.includes('fast') || lower.includes('excellent')) {
        sentiment = 'POS';
        sentimentScore = 0.85;
      } else if (lower.includes('bad') || lower.includes('slow') || lower.includes('issue') || lower.includes('error') || lower.includes('broken') || lower.includes('fail')) {
        sentiment = 'NEG';
        sentimentScore = -0.75;
      }

      const assignedThemes = existingThemeNames.length > 0 ? [existingThemeNames[0]] : ['General Experience'];

      return {
        success: true,
        data: {
          sentiment,
          sentimentScore,
          themes: assignedThemes,
          featureArea: 'User Experience',
          rationale: 'Automated offline heuristic classification.',
        },
      };
    }

    const cleanedText = stripMarkdownFences(rawText);
    const parseResult = tryParseAndValidate(cleanedText);

    if (parseResult.success) {
      return { success: true, data: parseResult.data };
    }

    return {
      success: false,
      error: `Classification failed Zod validation: ${parseResult.error}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown AI classification error',
    };
  }
}
