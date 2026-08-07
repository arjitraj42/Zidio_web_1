import { db } from '@/lib/db';
import { classifyFeedback } from '@/lib/ai';

// Palette of dynamic colors for newly generated themes
const THEME_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#F97316', // Orange
];

/**
 * Returns a consistent hex color for a given theme name based on string hash.
 * @param {string} themeName
 * @returns {string} Hex color string
 */
function getThemeColor(themeName) {
  if (!themeName) return THEME_COLORS[0];
  let hash = 0;
  for (let i = 0; i < themeName.length; i++) {
    hash = themeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % THEME_COLORS.length;
  return THEME_COLORS[index];
}

/**
 * Classifies a feedback item using Claude AI and persists sentiment, score, and themes in Postgres.
 * Safe for single creation, bulk processing, and re-classification operations.
 * 
 * @param {string} feedbackId - ID of the Feedback row to classify
 * @param {string} workspaceId - Tenant workspace ID for multi-tenant isolation
 * @returns {Promise<{ success: true, feedbackId: string, data: object } | { success: false, feedbackId: string, error: string }>}
 */
export async function classifyAndSaveFeedback(feedbackId, workspaceId) {
  if (!feedbackId || !workspaceId) {
    return {
      success: false,
      feedbackId: feedbackId || '',
      error: 'Missing required feedbackId or workspaceId',
    };
  }

  try {
    // 1. Fetch Feedback item ensuring tenant workspace isolation
    const feedback = await db.feedback.findFirst({
      where: {
        id: feedbackId,
        workspaceId,
      },
    });

    if (!feedback) {
      return {
        success: false,
        feedbackId,
        error: `Feedback item with ID ${feedbackId} not found in workspace`,
      };
    }

    // 2. Fetch existing Theme names for this workspace
    const existingThemes = await db.theme.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    });

    const themeNames = existingThemes.map((t) => t.name);

    // 3. Call Claude AI classification service layer
    const classificationResult = await classifyFeedback(
      feedback.content,
      themeNames
    );

    if (!classificationResult.success) {
      console.warn(
        `AI Classification failed for feedback ${feedbackId}: ${classificationResult.error}`
      );

      // On failure: ensure sentiment remains null so it is identifiable as "Needs Review"
      await db.feedback.update({
        where: { id: feedbackId },
        data: {
          sentiment: null,
          sentimentScore: null,
        },
      });

      return {
        success: false,
        feedbackId,
        error: classificationResult.error,
      };
    }

    const { sentiment, sentimentScore, themes } = classificationResult.data;

    // 4. Update sentiment and sentimentScore on Feedback row
    await db.feedback.update({
      where: { id: feedbackId },
      data: {
        sentiment,
        sentimentScore,
      },
    });

    // 5. Match or create Themes and upsert FeedbackTheme join records
    if (Array.isArray(themes) && themes.length > 0) {
      for (const themeNameRaw of themes) {
        const themeName = themeNameRaw.trim();
        if (!themeName) continue;

        // Check case-insensitive match among existing workspace themes
        let themeRecord = await db.theme.findFirst({
          where: {
            workspaceId,
            name: {
              equals: themeName,
              mode: 'insensitive',
            },
          },
        });

        // Create theme if it doesn't exist
        if (!themeRecord) {
          themeRecord = await db.theme.create({
            data: {
              name: themeName,
              workspaceId,
              color: getThemeColor(themeName),
              description: `AI-extracted theme for ${themeName}`,
            },
          });
        }

        // Upsert join table FeedbackTheme record
        await db.feedbackTheme.upsert({
          where: {
            feedbackId_themeId: {
              feedbackId,
              themeId: themeRecord.id,
            },
          },
          update: {
            confidence: 0.8,
          },
          create: {
            feedbackId,
            themeId: themeRecord.id,
            confidence: 0.8,
          },
        });
      }
    }

    return {
      success: true,
      feedbackId,
      data: classificationResult.data,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown database or classification error';
    console.error(`Error in classifyAndSaveFeedback for ${feedbackId}:`, err);
    return {
      success: false,
      feedbackId,
      error: errorMsg,
    };
  }
}
