import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/themes
 * Returns all Themes for the caller's workspace with total feedbackCount,
 * sorted by feedbackCount descending.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET() {
  const user = await getSessionUser();

  // RBAC Enforcement: Available to all three roles (read-only)
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const workspaceId = user.workspaceId;

    // Efficient Prisma query: select theme fields and aggregate count of linked FeedbackTheme rows
    const rawThemes = await db.theme.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
        createdAt: true,
        workspaceId: true,
        _count: {
          select: { feedback: true },
        },
      },
      orderBy: {
        feedback: {
          _count: 'desc',
        },
      },
    });

    // Format output so feedbackCount is a top-level property on each theme object
    const themes = rawThemes.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      color: t.color || '#6366F1',
      createdAt: t.createdAt,
      workspaceId: t.workspaceId,
      feedbackCount: t._count?.feedback ?? 0,
    }));

    // Double-check sorting in memory (most-discussed first)
    themes.sort((a, b) => b.feedbackCount - a.feedbackCount);

    return NextResponse.json({
      themes,
      total: themes.length,
    });
  } catch (err) {
    console.error('Error fetching workspace themes:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve themes', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
