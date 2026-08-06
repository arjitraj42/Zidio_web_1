const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { Anthropic } = require('@anthropic-ai/sdk');
const { z } = require('zod');

// 1. Manually load env variables from .env.local if not already in process.env
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  });
}

if (process.env.DATABASE_URL) {
  process.env.DIRECT_URL = process.env.DATABASE_URL;
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Zod schema matching Day 11 schema definition
const classificationSchema = z.object({
  sentiment: z.enum(['POS', 'NEU', 'NEG']),
  sentimentScore: z.number().min(-1).max(1),
  themes: z.array(z.string().min(1)).min(1),
  featureArea: z.string().min(1),
  rationale: z.string().min(1),
});

const THEME_COLORS = [
  '#6366F1', '#EC4899', '#10B981', '#F59E0B',
  '#8B5CF6', '#3B82F6', '#EF4444', '#14B8A6',
];

function getThemeColor(themeName) {
  if (!themeName) return THEME_COLORS[0];
  let hash = 0;
  for (let i = 0; i < themeName.length; i++) {
    hash = themeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return THEME_COLORS[Math.abs(hash) % THEME_COLORS.length];
}

function stripMarkdownFences(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  return cleaned.trim();
}

async function classifyContent(content, existingThemeNames = []) {
  const themeContext = existingThemeNames.length > 0
    ? `Existing workspace themes available for reuse:\n${existingThemeNames.map(t => `- "${t}"`).join('\n')}\n\nPrefer reusing existing themes when applicable.`
    : `No existing themes currently exist. Create concise, descriptive theme names.`;

  const systemPrompt = `You are an AI customer feedback classifier for Project LOOP.
Return ONLY a raw JSON object with NO markdown fences, preamble, or text.
Schema required:
{
  "sentiment": "POS" | "NEU" | "NEG",
  "sentimentScore": number (-1.0 to 1.0),
  "themes": string[],
  "featureArea": string,
  "rationale": string
}`;

  const userPrompt = `${themeContext}\n\nFeedback content to classify:\n"${content}"\n\nReturn ONLY raw JSON.`;

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const rawText = res.content?.[0]?.text || '';
    const cleaned = stripMarkdownFences(rawText);
    const parsed = JSON.parse(cleaned);
    const validated = classificationSchema.safeParse(parsed);

    if (validated.success) {
      return { success: true, data: validated.data };
    }

    // Retry once
    const retryRes = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: rawText },
        { role: 'user', content: 'Output failed validation. Return ONLY valid JSON matching exact schema.' },
      ],
    });

    const retryText = stripMarkdownFences(retryRes.content?.[0]?.text || '');
    const retryParsed = JSON.parse(retryText);
    const retryValidated = classificationSchema.safeParse(retryParsed);

    if (retryValidated.success) {
      return { success: true, data: retryValidated.data };
    }

    return { success: false, error: 'Failed validation on retry' };
  } catch (err) {
    return { success: false, error: err.message || 'Classification error' };
  }
}

async function classifyAndSaveSingle(feedbackItem) {
  const { id, content, workspaceId } = feedbackItem;

  const existingThemes = await prisma.theme.findMany({
    where: { workspaceId },
    select: { name: true },
  });
  const themeNames = existingThemes.map((t) => t.name);

  const result = await classifyContent(content, themeNames);

  if (!result.success) {
    return { success: false, id, error: result.error };
  }

  const { sentiment, sentimentScore, themes } = result.data;

  await prisma.feedback.update({
    where: { id },
    data: { sentiment, sentimentScore },
  });

  if (Array.isArray(themes)) {
    for (const rawName of themes) {
      const themeName = rawName.trim();
      if (!themeName) continue;

      let themeRec = await prisma.theme.findFirst({
        where: {
          workspaceId,
          name: { equals: themeName, mode: 'insensitive' },
        },
      });

      if (!themeRec) {
        themeRec = await prisma.theme.create({
          data: {
            name: themeName,
            workspaceId,
            color: getThemeColor(themeName),
            description: `AI-extracted theme for ${themeName}`,
          },
        });
      }

      await prisma.feedbackTheme.upsert({
        where: {
          feedbackId_themeId: { feedbackId: id, themeId: themeRec.id },
        },
        update: { confidence: 0.8 },
        create: { feedbackId: id, themeId: themeRec.id, confidence: 0.8 },
      });
    }
  }

  return { success: true, id, sentiment, themes };
}

async function runBackfill() {
  const targetWorkspaceId = process.argv[2] || null;

  console.log('🚀 Starting Project LOOP Feedback Classification Back-fill script...');
  if (targetWorkspaceId) {
    console.log(`Scoped to Workspace ID: ${targetWorkspaceId}`);
  } else {
    console.log('Running across ALL workspaces...');
  }

  const whereClause = {
    sentiment: null,
    ...(targetWorkspaceId ? { workspaceId: targetWorkspaceId } : {}),
  };

  const unclassifiedItems = await prisma.feedback.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  const total = unclassifiedItems.length;
  console.log(`📊 Found ${total} unclassified feedback rows.`);

  if (total === 0) {
    console.log('✨ All feedback rows are already classified! Nothing to back-fill.');
    await prisma.$disconnect();
    return;
  }

  let successCount = 0;
  let failureCount = 0;
  const batchSize = 5;

  for (let i = 0; i < total; i += batchSize) {
    const batch = unclassifiedItems.slice(i, i + batchSize);
    const results = await Promise.all(batch.map((item) => classifyAndSaveSingle(item)));

    results.forEach((res, idx) => {
      const itemNum = i + idx + 1;
      if (res.success) {
        successCount++;
        console.log(
          `[${itemNum}/${total}] ✅ Classified item ${res.id.substring(0, 8)}... -> Sentiment: ${res.sentiment}, Themes: [${(res.themes || []).join(', ')}]`
        );
      } else {
        failureCount++;
        console.warn(
          `[${itemNum}/${total}] ❌ Failed item ${res.id.substring(0, 8)}... -> Error: ${res.error}`
        );
      }
    });

    // Small 200ms delay between batches to respect rate limits
    if (i + batchSize < total) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log('\n================ BACKFILL SUMMARY ================');
  console.log(`Total Unclassified Processed : ${total}`);
  console.log(`Successfully Classified      : ${successCount}`);
  console.log(`Failed / Flagged for Review   : ${failureCount}`);
  console.log('==================================================\n');

  await prisma.$disconnect();
}

runBackfill().catch(async (e) => {
  console.error('Fatal backfill error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
