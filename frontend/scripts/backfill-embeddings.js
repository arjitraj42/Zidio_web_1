const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// 1. Load environment variables from .env.local if present
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

const db = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const VECTOR_DIMENSION = 1536;

/**
 * Deterministic fallback 1536-dim unit float vector generator
 */
function generateFallbackEmbedding(text) {
  const vector = new Array(VECTOR_DIMENSION).fill(0);
  if (!text) return vector;

  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return vector;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % VECTOR_DIMENSION;
    vector[idx] += 1.0;

    if (i < words.length - 1) {
      const bigram = `${word}_${words[i + 1]}`;
      let bHash = 0;
      for (let k = 0; k < bigram.length; k++) {
        bHash = (bHash << 5) - bHash + bigram.charCodeAt(k);
        bHash |= 0;
      }
      const bIdx = Math.abs(bHash) % VECTOR_DIMENSION;
      vector[bIdx] += 1.5;
    }
  }

  let norm = 0;
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIMENSION; i++) {
      vector[i] = vector[i] / norm;
    }
  }

  return vector;
}

/**
 * Generates vector using OpenAI API or fallback
 */
async function embedText(text) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.trim(),
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const vector = json?.data?.[0]?.embedding;
        if (Array.isArray(vector) && vector.length === VECTOR_DIMENSION) {
          return vector;
        }
      }
    } catch (e) {
      // Fall through to fallback
    }
  }

  return generateFallbackEmbedding(text);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runEmbeddingsBackfill() {
  console.log('====================================================');
  console.log('Project LOOP — Ask LOOP Embeddings Back-Fill Utility');
  console.log('====================================================');

  try {
    // Query all feedback items that do not currently have an Embedding row
    const unembeddedItems = await db.feedback.findMany({
      where: {
        embedding: null,
      },
      select: {
        id: true,
        content: true,
        workspaceId: true,
      },
    });

    const total = unembeddedItems.length;
    console.log(`\nFound ${total} Feedback items needing vector embeddings.`);

    if (total === 0) {
      console.log('All feedback items are already embedded! Exiting.\n');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < total; i++) {
      const item = unembeddedItems[i];
      const progress = `[${i + 1}/${total}]`;

      try {
        const vector = await embedText(item.content);
        const vectorString = `[${vector.join(',')}]`;

        try {
          await db.$executeRaw`
            INSERT INTO "Embedding" ("id", "feedbackId", "vector", "createdAt")
            VALUES (gen_random_uuid(), ${item.id}, CAST(${vectorString} AS vector), NOW())
            ON CONFLICT ("feedbackId") 
            DO UPDATE SET "vector" = CAST(${vectorString} AS vector);
          `;
        } catch (rawErr) {
          // If raw SQL fails, log warning
          console.warn(`\n${progress} Raw pgvector insert error for item ${item.id}:`, rawErr.message);
        }

        successCount++;
        console.log(`${progress} Embedded feedback ID: ${item.id} (${item.content.substring(0, 40)}...)`);
      } catch (err) {
        failCount++;
        console.error(`${progress} Failed to embed feedback ID: ${item.id}`, err.message);
      }

      // Rate-limiting delay between embeddings (100ms)
      await sleep(100);
    }

    console.log('\n====================================================');
    console.log(`Back-fill completed: ${successCount} embedded, ${failCount} failed.`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Fatal error during embeddings back-fill script execution:', err);
  } finally {
    await db.$disconnect();
  }
}

runEmbeddingsBackfill();
