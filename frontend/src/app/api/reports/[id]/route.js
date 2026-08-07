import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/reports/[id]
 * Retrieves a single saved Voice-of-Customer report with full contentJson and author details.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET(req, { params }) {
  const user = await getSessionUser();

  // RBAC Enforcement: Available to all three roles
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const { id: reportId } = params;
    const workspaceId = user.workspaceId;

    // Verify report exists AND belongs to caller's workspace (don't leak existence across tenants)
    const report = await db.report.findFirst({
      where: {
        id: reportId,
        workspaceId,
      },
      include: {
        generatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (err) {
    console.error('Error fetching report detail:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve report detail', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
