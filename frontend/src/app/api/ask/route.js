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

// Zod schema for Claude's structured JSON response
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
 * POST /api/ask
 * Grounded RAG Q&A endpoint for Ask LOOP.
 * Retrieves top relevant customer feedback items via semantic vector search (workspace-isolated),
 * then passes context to Claude AI for grounded Q&A with verifiable citations.
 * 
 * Permitted roles: ADMIN, ANALYST, VIEWER (read-only).
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Permitted for all authenticated workspace roles
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

    // 1. Embed user question into 1536-dimensional vector
    const questionVector = await embedText(question);

    // 2. Perform semantic vector similarity search strictly scoped to caller's workspaceId
    const retrievedItems = await findSimilarFeedback(workspaceId, questionVector, 8);

    // If workspace has no feedback items or vector search returned 0 items
    if (!retrievedItems || retrievedItems.length === 0) {
      return NextResponse.json({
        answer: "I don't have enough customer feedback data in your workspace to answer that question.",
        citedItems: [],
        question,
      });
    }

    // 3. Construct numbered context block for Claude AI
    const contextLines = retrievedItems.map((item, index) => {
      const itemNum = index + 1;
      const dateStr = item.createdAt
        ? new Date(item.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Unknown Date';
      const sender = item.customerLabel ? ` | Sender: ${item.customerLabel}` : '';

      return `[${itemNum}] Channel: ${item.channel} | Date: ${dateStr}${sender}\nContent: "${item.content}"`;
    });

    const contextText = contextLines.join('\n\n');

    // 4. Construct System and User Prompts enforcing strict groundedness
    const systemPrompt = `You are Ask LOOP, an AI customer intelligence Q&A assistant for Project LOOP.
Your job is to answer user questions about customer feedback using ONLY the retrieved feedback items provided in context.

STRICT GROUNDEDNESS RULES:
1. Answer ONLY using information explicitly stated in the numbered feedback items provided below.
2. Do NOT use outside knowledge, extrapolate beyond the facts, or invent feedback.
3. If the provided feedback items do not contain sufficient evidence to answer the user's question, you MUST set answer to: "I don't have enough customer feedback data in your workspace to answer that question." and set citedItemIndexes to [].
4. When you DO answer from the provided items, cite which item numbers ([1], [2], etc.) you used in citedItemIndexes array (1-indexed).

RESPONSE FORMAT:
Return ONLY a raw JSON object with NO preamble, NO conversational filler, and NO markdown code fences.

JSON Schema:
{
  "answer": string (detailed, helpful answer grounded in the feedback items, or the exact insufficient data fallback message),
  "citedItemIndexes": number[] (array of 1-indexed numbers corresponding to the context items referenced, e.g. [1, 3])
}`;

    const userPrompt = `Retrieved Workspace Customer Feedback Items:

${contextText}

----------------------------------------------------
User Question: "${question}"

Return ONLY valid JSON matching the schema.`;

    // 5. Call Claude AI for grounded completion
    const model = 'claude-sonnet-4-6';

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawOutput = response.content?.[0]?.text || '';
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
      // Fallback: Use raw output if valid string, else default fallback
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
          // Avoid duplicate citations
          if (!citedItems.some((c) => c.id === item.id)) {
            citedItems.push({
              id: item.id,
              content: item.content,
              channel: item.channel,
              customerLabel: item.customerLabel,
              createdAt: item.createdAt,
            });
          }
        }
      });
    }

    return NextResponse.json({
      answer,
      citedItems,
      question,
    });
  } catch (err) {
    console.error('Error handling Ask LOOP question:', err);
    return NextResponse.json(
      { error: 'Failed to process question', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
