import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';
import { db } from '@/lib/db';

/**
 * GET /api/feedback/filter-options
 * Returns distinct channels currently in use for the user's workspace,
 * and the list of workspace Themes (id, name, color) to populate dynamic UI filter controls.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET() {
  const user = await getSessionUser();

  // RBAC Enforcement
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const workspaceId = user.workspaceId;

    // Fetch distinct channels in use within caller's workspace
    const rawChannels = await db.feedback.findMany({
      where: { workspaceId },
      select: { channel: true },
      distinct: ['channel'],
    });

    const channels = rawChannels.map((item) => item.channel).filter(Boolean);

    // Fetch workspace themes
    const themes = await tenantDb(workspaceId).theme.findMany({
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      channels,
      themes,
    });
  } catch (err) {
    console.error('Error fetching filter options:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve filter options', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
