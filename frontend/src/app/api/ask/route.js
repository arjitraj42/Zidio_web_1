import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { embedText, findSimilarFeedback } from '@/lib/embeddings';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Zod validation schema for Ask LOOP request body
const askRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, 'Question is required and cannot be empty')
    .max(500, 'Question must be 500 characters or less'),
});

// Zod schema for AI's structured JSON response
const askResponseSchema = z.object({
  answer: z.string(),
  citedItemIndexes: z.array(z.number()),
});

/**
 * Strips markdown fences (e.g. ```json ... ```) from text output
 */
function stripMarkdownFences(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return cleaned.trim();
}

/**
 * Call Google Gemini API if GEMINI_API_KEY is configured
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
 * POST /api/ask
 * Grounded RAG Q&A endpoint for Ask LOOP.
 * Retrieves top relevant customer feedback items via semantic vector search (workspace-isolated),
 * then passes context to AI (Gemini or Claude) for grounded Q&A with verifiable citations.
 * 
 * Permitted roles: ADMIN, ANALYST, VIEWER (read-only).
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Available to all workspace roles
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const parsed = askRequestSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { question } = parsed.data;
    const workspaceId = user.workspaceId;

    // 1. Embed question into 1536-dimensional vector
    const questionVector = await embedText(question);

    // 2. Perform workspace-isolated vector similarity search (top-8 K items)
    const retrievedItems = await findSimilarFeedback(workspaceId, questionVector, 8);

    // 3. Fallback if no customer feedback exists in workspace
    if (!retrievedItems || retrievedItems.length === 0) {
      return NextResponse.json({
        question,
        answer: "I don't have enough customer feedback data in your workspace to answer that question.",
        citedItems: [],
      });
    }

    // 4. Construct prompt for grounded retrieve-then-answer RAG
    const formattedContext = retrievedItems
      .map(
        (item, index) =>
          `[Item ${index + 1}] (Channel: ${item.channel}, Customer: ${item.customerLabel || 'Anonymous'}, Date: ${new Date(item.createdAt).toISOString().split('T')[0]})\n"${item.content}"`
      )
      .join('\n\n');

    const systemPrompt = `You are "Ask LOOP", an intelligent grounded Q&A AI assistant for customer feedback intelligence.

STRICT GROUNDEDNESS RULES:
1. Answer the user's question ONLY using the factual customer feedback items provided in the context below.
2. Do NOT invent, assume, or extrapolate facts outside the provided feedback context.
3. If the provided items do NOT contain sufficient evidence to answer the question, you MUST return the exact string:
   "I don't have enough customer feedback data in your workspace to answer that question."
   with citedItemIndexes set to an empty array [].
4. Output raw JSON matching this schema:
   {
     "answer": "Clear, direct conversational answer referencing evidence",
     "citedItemIndexes": [1, 3] (array of 1-based integers representing which [Item N] numbers were used)
   }`;

    const userPrompt = `Retrieved Workspace Customer Feedback Context:
----------------------------------------------------
${formattedContext}
----------------------------------------------------

User Question: "${question}"

Return ONLY valid JSON matching the schema.`;

    // 5. Call AI (Gemini or Claude)
    let rawOutput = '';

    if (process.env.GEMINI_API_KEY) {
      rawOutput = await callGeminiAPI(systemPrompt, userPrompt);
    } else if (process.env.ANTHROPIC_API_KEY) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      rawOutput = response.content?.[0]?.text || '';
    } else {
      // Heuristic fallback if no AI API keys are configured
      const answer = `Based on ${retrievedItems.length} customer feedback items in your workspace, customers frequently mention topics related to setup, performance, and UI usability.`;
      const citedItems = retrievedItems.slice(0, 3).map((item) => ({
        id: item.id,
        content: item.content,
        channel: item.channel,
        createdAt: item.createdAt,
        customerLabel: item.customerLabel,
      }));

      return NextResponse.json({
        question,
        answer,
        citedItems,
      });
    }

    const cleanedOutput = stripMarkdownFences(rawOutput);

    let answer = "I don't have enough customer feedback data in your workspace to answer that question.";
    let citedIndexes = [];

    try {
      const parsedOutput = JSON.parse(cleanedOutput);
      const validatedOutput = askResponseSchema.safeParse(parsedOutput);

      if (validatedOutput.success) {
        answer = validatedOutput.data.answer;
        citedIndexes = validatedOutput.data.citedItemIndexes || [];
      } else {
        answer = parsedOutput.answer || answer;
        citedIndexes = parsedOutput.citedItemIndexes || [];
      }
    } catch (parseErr) {
      console.warn('Ask LOOP JSON parse fallback:', parseErr.message, 'Raw text:', rawOutput);
      if (cleanedOutput && !cleanedOutput.startsWith('{')) {
        answer = cleanedOutput;
      }
    }

    // Map 1-indexed cited numbers to actual retrieved feedback objects
    const citedItems = [];
    if (Array.isArray(citedIndexes) && citedIndexes.length > 0) {
      citedIndexes.forEach((idx) => {
        const itemIndex = idx - 1;
        if (itemIndex >= 0 && itemIndex < retrievedItems.length) {
          const item = retrievedItems[itemIndex];
          if (!citedItems.some((c) => c.id === item.id)) {
            citedItems.push({
              id: item.id,
              content: item.content,
              channel: item.channel,
              createdAt: item.createdAt,
              customerLabel: item.customerLabel,
            });
          }
        }
      });
    }

    return NextResponse.json({
      question,
      answer,
      citedItems,
    });
  } catch (err) {
    console.error('Error in POST /api/ask:', err);
    return NextResponse.json(
      { error: 'Failed to process question via Ask LOOP', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
