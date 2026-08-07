import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/themes/[id]/feedback
 * Drill-down endpoint returning paginated feedback items linked to a single theme,
 * including each item's AI confidence score from the FeedbackTheme join table.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET(req, { params }) {
  const user = await getSessionUser();

  // RBAC Enforcement: Available to all three roles
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const { id: themeId } = params;
    const workspaceId = user.workspaceId;

    // 1. Verify theme exists AND belongs to caller's workspace (don't leak existence of cross-tenant themes)
    const theme = await db.theme.findFirst({
      where: {
        id: themeId,
        workspaceId,
      },
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // 2. Parse pagination query parameters (?page, ?pageSize / ?take)
    const { searchParams } = new URL(req.url);
    const rawPage = parseInt(searchParams.get('page') || '1', 10);
    const rawPageSize = parseInt(
      searchParams.get('pageSize') || searchParams.get('take') || '10',
      10
    );

    const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
    const pageSize = Math.max(1, Math.min(100, isNaN(rawPageSize) ? 10 : rawPageSize));
    const skip = (page - 1) * pageSize;

    // 3. Query total count and paginated FeedbackTheme join records
    const whereClause = {
      themeId,
      feedback: {
        workspaceId,
      },
    };

    const [total, feedbackThemeRows] = await Promise.all([
      db.feedbackTheme.count({ where: whereClause }),
      db.feedbackTheme.findMany({
        where: whereClause,
        include: {
          feedback: {
            include: {
              themes: {
                include: {
                  theme: true,
                },
              },
            },
          },
        },
        orderBy: {
          feedback: {
            createdAt: 'desc',
          },
        },
        take: pageSize,
        skip,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    // Format output feedback items with top-level confidence score
    const items = feedbackThemeRows.map((row) => ({
      ...row.feedback,
      confidence: row.confidence,
    }));

    return NextResponse.json({
      theme: {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        color: theme.color || '#6366F1',
        workspaceId: theme.workspaceId,
        createdAt: theme.createdAt,
      },
      items,
      feedback: items, // Backwards compatibility helper
      total,
      page,
      pageSize,
      totalPages,
      pagination: {
        total,
        take: pageSize,
        skip,
        page,
        totalPages,
      },
    });
  } catch (err) {
    console.error('Error fetching theme drill-down feedback:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback for theme', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
