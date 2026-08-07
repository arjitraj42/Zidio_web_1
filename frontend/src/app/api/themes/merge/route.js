import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * POST /api/themes/merge
 * Admin-only utility endpoint to merge a duplicate Theme into a target Theme.
 * Reassigns or de-duplicates all FeedbackTheme join records, then deletes the source Theme.
 * 
 * Body parameters:
 * - sourceThemeId: ID of theme to be merged and deleted
 * - targetThemeId: ID of theme that will retain all feedback links
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: ADMIN only
  const rbacError = requireRole(user, ['ADMIN']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const { sourceThemeId, targetThemeId } = body || {};

    if (!sourceThemeId || !targetThemeId) {
      return NextResponse.json(
        { error: 'Both sourceThemeId and targetThemeId are required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (sourceThemeId === targetThemeId) {
      return NextResponse.json(
        { error: 'Source and target themes must be different', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const workspaceId = user.workspaceId;

    // Verify both themes belong to caller's workspaceId
    const [sourceTheme, targetTheme] = await Promise.all([
      db.theme.findFirst({ where: { id: sourceThemeId, workspaceId } }),
      db.theme.findFirst({ where: { id: targetThemeId, workspaceId } }),
    ]);

    if (!sourceTheme || !targetTheme) {
      return NextResponse.json(
        { error: 'One or both themes were not found in your workspace', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Execute atomic merge transaction
    await db.$transaction(async (tx) => {
      // 1. Get all feedback IDs already attached to targetTheme
      const targetLinks = await tx.feedbackTheme.findMany({
        where: { themeId: targetThemeId },
        select: { feedbackId: true },
      });
      const targetFeedbackIds = new Set(targetLinks.map((l) => l.feedbackId));

      // 2. Get all feedback links attached to sourceTheme
      const sourceLinks = await tx.feedbackTheme.findMany({
        where: { themeId: sourceThemeId },
      });

      for (const link of sourceLinks) {
        if (targetFeedbackIds.has(link.feedbackId)) {
          // If feedback is already linked to target theme, delete duplicate link
          await tx.feedbackTheme.delete({
            where: {
              feedbackId_themeId: {
                feedbackId: link.feedbackId,
                themeId: sourceThemeId,
              },
            },
          });
        } else {
          // Otherwise delete source link and create target link
          await tx.feedbackTheme.delete({
            where: {
              feedbackId_themeId: {
                feedbackId: link.feedbackId,
                themeId: sourceThemeId,
              },
            },
          });
          await tx.feedbackTheme.create({
            data: {
              feedbackId: link.feedbackId,
              themeId: targetThemeId,
              confidence: link.confidence || 0.8,
            },
          });
        }
      }

      // 3. Delete the source Theme row
      await tx.theme.delete({
        where: { id: sourceThemeId },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully merged "${sourceTheme.name}" into "${targetTheme.name}".`,
      mergedTheme: targetTheme,
    });
  } catch (err) {
    console.error('Error merging themes:', err);
    return NextResponse.json(
      { error: 'Failed to merge themes', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
