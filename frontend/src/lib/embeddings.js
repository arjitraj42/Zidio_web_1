import { db } from '@/lib/db';

/**
 * SERVER-SIDE ONLY MODULE: lib/embeddings.js
 * Provides vector embedding generation and storage for Ask LOOP semantic retrieval.
 */

const VECTOR_DIMENSION = 1536;

/**
 * Generates a 1536-dimensional unit vector embedding for input text.
 * Uses OpenAI API (text-embedding-3-small) if OPENAI_API_KEY is available,
 * otherwise uses a deterministic fallback semantic hash vector generator.
 * 
 * @param {string} text - Raw input text to embed
 * @returns {Promise<number[]>} Array of 1536 float numbers
 */
export async function embedText(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return new Array(VECTOR_DIMENSION).fill(0);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
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

      if (response.ok) {
        const json = await response.json();
        const vector = json?.data?.[0]?.embedding;
        if (Array.isArray(vector) && vector.length === VECTOR_DIMENSION) {
          return vector;
        }
      } else {
        console.warn(`OpenAI Embeddings API error status ${response.status}. Using fallback embedder.`);
      }
    } catch (err) {
      console.warn('OpenAI Embeddings API call failed. Using fallback embedder:', err);
    }
  }

  // Fallback: Deterministic 1536-dimensional semantic hash vector generator
  return generateFallbackEmbedding(text);
}

/**
 * Generates a deterministic, unit-normalized 1536-dimensional vector for a string
 * based on word tokens, character n-grams, and semantic feature hashing.
 * 
 * @param {string} text 
 * @returns {number[]} 1536-dim unit float vector
 */
function generateFallbackEmbedding(text) {
  const vector = new Array(VECTOR_DIMENSION).fill(0);
  const cleaned = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);

  if (words.length === 0) return vector;

  // Hash words and bigrams into vector dimensions
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Word hash
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }
    const idx = Math.abs(hash) % VECTOR_DIMENSION;
    vector[idx] += 1.0;

    // Bigram hash
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

  // Compute L2 norm (magnitude) and normalize vector to unit length
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
 * Computes Cosine Similarity between two numerical vectors.
 * 
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} Cosine similarity score between -1.0 and 1.0
 */
export function computeCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Creates or updates an Embedding row for a given Feedback item.
 * 
 * @param {string} feedbackId - ID of the Feedback item
 * @param {string} content - Raw content text to embed
 * @returns {Promise<boolean>} Success boolean
 */
export async function upsertEmbedding(feedbackId, content) {
  if (!feedbackId || !content) return false;

  try {
    const vector = await embedText(content);
    const vectorString = `[${vector.join(',')}]`;

    // Attempt PostgreSQL pgvector raw query insertion
    try {
      await db.$executeRaw`
        INSERT INTO "Embedding" ("id", "feedbackId", "vector", "createdAt")
        VALUES (gen_random_uuid(), ${feedbackId}, CAST(${vectorString} AS vector), NOW())
        ON CONFLICT ("feedbackId") 
        DO UPDATE SET "vector" = CAST(${vectorString} AS vector);
      `;
      return true;
    } catch (pgError) {
      console.warn(`pgvector direct insert failed for ${feedbackId}. Error: ${pgError.message}`);
      return false;
    }
  } catch (err) {
    console.error(`Error in upsertEmbedding for feedback ${feedbackId}:`, err);
    return false;
  }
}

/**
 * Performs semantic vector similarity search strictly scoped to a workspaceId.
 * Retrieves top-K most relevant Feedback items for a question embedding.
 * 
 * @param {string} workspaceId - Tenant workspace ID
 * @param {number[]} questionVector - 1536-dim question vector
 * @param {number} [topK=8] - Number of top matches to return
 * @returns {Promise<Array<{ id: string, content: string, channel: string, customerLabel: string|null, createdAt: Date, similarity: number }>>}
 */
export async function findSimilarFeedback(workspaceId, questionVector, topK = 8) {
  if (!workspaceId || !questionVector) return [];

  const vectorString = `[${questionVector.join(',')}]`;

  try {
    // 1. Try pgvector SQL similarity search (1 - cosine distance)
    const rawResults = await db.$queryRaw`
      SELECT f.id, f.content, f.channel, f."customerLabel", f."createdAt",
             (1 - (e.vector <=> CAST(${vectorString} AS vector))) AS similarity
      FROM "Feedback" f
      JOIN "Embedding" e ON e."feedbackId" = f.id
      WHERE f."workspaceId" = ${workspaceId}
      ORDER BY similarity DESC
      LIMIT ${topK};
    `;

    if (Array.isArray(rawResults) && rawResults.length > 0) {
      return rawResults.map((r) => ({
        id: r.id,
        content: r.content,
        channel: r.channel,
        customerLabel: r.customerLabel,
        createdAt: r.createdAt,
        similarity: typeof r.similarity === 'number' ? r.similarity : parseFloat(r.similarity || '0'),
      }));
    }
  } catch (rawErr) {
    console.warn(`pgvector raw similarity search failed. Falling back to Prisma query: ${rawErr.message}`);
  }

  // 2. Fallback: Fetch workspace feedback and compute similarity in JS if pgvector query fails
  try {
    const feedbackItems = await db.feedback.findMany({
      where: { workspaceId },
      select: {
        id: true,
        content: true,
        channel: true,
        customerLabel: true,
        createdAt: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const scored = feedbackItems.map((item) => {
      const itemVector = generateFallbackEmbedding(item.content);
      const similarity = computeCosineSimilarity(questionVector, itemVector);
      return {
        ...item,
        similarity,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  } catch (err) {
    console.error('Fallback vector search error:', err);
    return [];
  }
}
