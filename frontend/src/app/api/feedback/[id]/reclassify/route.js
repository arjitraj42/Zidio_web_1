import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { classifyAndSaveFeedback } from '@/lib/classifyAndSave';

/**
 * POST /api/feedback/[id]/reclassify
 * Manually triggers AI re-classification for a specific feedback item.
 * Overwrites existing sentiment, score, and theme assignments.
 * 
 * Permitted roles: ADMIN, ANALYST (VIEWER receives 403 Forbidden).
 */
export async function POST(req, { params }) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN & ANALYST can trigger re-classification
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  // Handle Next.js 15 params promise/object compatibility
  const resolvedParams = params instanceof Promise ? await params : params;
  const { id } = resolvedParams || {};

  if (!id) {
    return NextResponse.json(
      { error: 'Feedback ID parameter is required', code: 'INVALID_ID' },
      { status: 400 }
    );
  }

  try {
    // Cross-tenant verification: Ensure target feedback item belongs to caller's workspace
    const existingItem = await db.feedback.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Feedback item not found in your workspace', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Execute re-classification service layer
    const result = await classifyAndSaveFeedback(id, user.workspaceId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: `Re-classification failed: ${result.error}`,
          code: 'CLASSIFICATION_FAILED',
        },
        { status: 422 }
      );
    }

    // Fetch updated record with relations (themes)
    const updatedFeedback = await db.feedback.findFirst({
      where: {
        id,
        workspaceId: user.workspaceId,
      },
      include: {
        themes: {
          include: {
            theme: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Feedback re-classified successfully',
      feedback: updatedFeedback,
      classification: result.data,
    });
  } catch (err) {
    console.error(`Error re-classifying feedback item ${id}:`, err);
    return NextResponse.json(
      { error: 'Failed to re-classify feedback item', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
