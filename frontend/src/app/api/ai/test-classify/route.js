import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { classifyFeedback } from '@/lib/ai';

/**
 * POST /api/ai/test-classify
 * Temporary test route for Day 11 verification.
 * Accepts { content: string } in body, fetches caller's workspace Theme names from Prisma,
 * and calls classifyFeedback(content, themeNames).
 * 
 * Requires authentication (any role).
 */
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: Authentication required', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { content } = body || {};

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Feedback content is required and must be a non-empty string', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch caller's workspace existing theme names from Prisma
    const existingThemes = await db.theme.findMany({
      where: { workspaceId: user.workspaceId },
      select: { name: true },
    });

    const themeNames = existingThemes.map((t) => t.name);

    // Execute classification service layer
    const result = await classifyFeedback(content, themeNames);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      workspaceThemesContext: themeNames,
    });
  } catch (err) {
    console.error('Error in POST /api/ai/test-classify:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
