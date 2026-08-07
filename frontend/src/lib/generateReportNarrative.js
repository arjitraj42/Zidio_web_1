import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Zod schema for structured narrative output
export const reportNarrativeSchema = z.object({
  executiveSummary: z.string(),
  topThemesAnalysis: z.string(),
  sentimentShiftCommentary: z.string(),
  notableQuotes: z.array(
    z.object({
      quote: z.string(),
      channel: z.string(),
      sentiment: z.string(),
      takeaway: z.string(),
    })
  ),
  recommendedActions: z.array(z.string()),
});

/**
 * Strips markdown code block formatting (e.g. ```json ... ```) from output
 */
function stripMarkdownFences(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return cleaned.trim();
}

/**
 * Generates an executive Voice-of-Customer report narrative using Claude AI grounded strictly in pre-computed stats.
 * 
 * @param {object} stats - Pre-computed stats object from computeReportStats
 * @returns {Promise<{ executiveSummary: string, topThemesAnalysis: string, sentimentShiftCommentary: string, notableQuotes: Array<object>, recommendedActions: string[] }>}
 */
export async function generateReportNarrative(stats) {
  if (!stats) {
    throw new Error('generateReportNarrative requires a valid stats object');
  }

  const systemPrompt = `You are an executive Voice-of-Customer (VoC) strategist for Project LOOP.
Your task is to analyze pre-computed customer feedback stats for a workspace and write a professional, highly actionable executive report.

STRICT REQUIREMENTS:
1. Base all analysis STRICTLY on the numbers, percentages, themes, and verbatim quotes provided in the JSON context below.
2. Never invent additional statistics, numbers, or fictional user quotes.
3. For notableQuotes, use the EXACT verbatim quotes provided in context. Do NOT paraphrase or alter customer text.
4. Output 3 to 5 concrete, actionable product/operations recommended actions based on the data.
5. Return ONLY a raw JSON object matching the required schema with NO conversational text and NO markdown code fences.

JSON Response Schema:
{
  "executiveSummary": "2-3 clear paragraphs summarizing total volume, overall sentiment trajectory, and key operational insights.",
  "topThemesAnalysis": "Detailed paragraph analyzing top feedback themes and volume changes.",
  "sentimentShiftCommentary": "Commentary on positive vs negative percentage shifts compared to the prior period.",
  "notableQuotes": [
    {
      "quote": "Exact verbatim quote string from input data",
      "channel": "e.g. support_ticket or app_review",
      "sentiment": "POS | NEU | NEG",
      "takeaway": "1 sentence executive takeaway explaining why this quote is significant"
    }
  ],
  "recommendedActions": [
    "1-2 sentence recommendation 1",
    "1-2 sentence recommendation 2",
    "1-2 sentence recommendation 3"
  ]
}`;

  const userPrompt = `Pre-computed Workspace Feedback Statistics:
${JSON.stringify(stats, null, 2)}

Generate the structured executive VoC report in raw JSON matching the schema.`;

  const model = 'claude-sonnet-4-6';

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = response.content?.[0]?.text || '';
    const cleanedText = stripMarkdownFences(rawText);

    const parsed = JSON.parse(cleanedText);
    const validated = reportNarrativeSchema.safeParse(parsed);

    if (validated.success) {
      return validated.data;
    }

    console.warn('Report narrative Zod validation fallback:', validated.error);
    return {
      executiveSummary: parsed.executiveSummary || 'Executive summary generated.',
      topThemesAnalysis: parsed.topThemesAnalysis || 'Top themes analysis generated.',
      sentimentShiftCommentary: parsed.sentimentShiftCommentary || 'Sentiment shifts analyzed.',
      notableQuotes: Array.isArray(parsed.notableQuotes) ? parsed.notableQuotes : [],
      recommendedActions: Array.isArray(parsed.recommendedActions) ? parsed.recommendedActions : [],
    };
  } catch (err) {
    console.error('Error generating report narrative with Claude:', err);

    // Fallback narrative generation if Claude call fails or times out
    return {
      executiveSummary: `During this ${stats.durationDays}-day period, a total of ${stats.totalFeedback.current} customer feedback items were ingested across your workspace channels (${stats.totalFeedback.percentChange >= 0 ? '+' : ''}${stats.totalFeedback.percentChange}% shift vs prior period).`,
      topThemesAnalysis: `The top feedback themes driving conversation were: ${stats.topThemes.map((t) => `${t.name} (${t.count} items)`).join(', ')}.`,
      sentimentShiftCommentary: `Positive feedback comprised ${stats.sentimentBreakdown.current.posPercent}% of total volume (${stats.sentimentBreakdown.shifts.posShift >= 0 ? '+' : ''}${stats.sentimentBreakdown.shifts.posShift}% shift), while negative feedback accounted for ${stats.sentimentBreakdown.current.negPercent}%.`,
      notableQuotes: (stats.representativeQuotes || []).map((q) => ({
        quote: q.content,
        channel: q.channel,
        sentiment: q.sentiment,
        takeaway: `Representative customer voice from ${q.channel}.`,
      })),
      recommendedActions: [
        `Address top driver theme "${stats.topThemes[0]?.name || 'User Experience'}" by reviewing low-confidence items.`,
        'Monitor negative sentiment shifts in active channels.',
        'Share notable customer verbatims with engineering and product teams.',
      ],
    };
  }
}
