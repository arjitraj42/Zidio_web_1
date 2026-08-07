import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeReportStats } from '@/lib/reportStats';
import { generateReportNarrative } from '@/lib/generateReportNarrative';

// Zod schema for report creation request body
const createReportSchema = z.object({
  periodStart: z.string().datetime({ offset: true }).or(z.string().min(1)),
  periodEnd: z.string().datetime({ offset: true }).or(z.string().min(1)),
  title: z.string().trim().optional(),
});

/**
 * GET /api/reports
 * Lists all saved Voice-of-Customer reports for the caller's workspace.
 * Permitted roles: ADMIN, ANALYST, VIEWER (read-only access).
 */
export async function GET() {
  const user = await getSessionUser();

  // RBAC Enforcement: Available to all three roles
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const workspaceId = user.workspaceId;

    const reports = await db.report.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        periodStart: true,
        periodEnd: true,
        createdAt: true,
        workspaceId: true,
        generatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      reports,
      total: reports.length,
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve saved reports', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports
 * Pre-computes statistics and generates an executive Voice-of-Customer report via Claude AI.
 * Persists the report in Postgres.
 * Permitted roles: ADMIN, ANALYST. (VIEWER role is restricted).
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: ADMIN and ANALYST only
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { periodStart, periodEnd, title: inputTitle } = parsed.data;
    const workspaceId = user.workspaceId;

    const startDate = new Date(periodStart);
    const endDate = new Date(periodEnd);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid periodStart or periodEnd date format', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (startDate >= endDate) {
      return NextResponse.json(
        { error: 'periodStart must be before periodEnd', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // 1. Pre-compute statistics directly from database
    const stats = await computeReportStats(workspaceId, startDate, endDate);

    // 2. Generate grounded narrative report using Claude AI
    const narrative = await generateReportNarrative(stats);

    // 3. Generate default report title if not provided
    const startFmt = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const endFmt = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const reportTitle = inputTitle?.trim() || `Voice of Customer (${startFmt} - ${endFmt})`;

    // 4. Save report row in Postgres
    const newReport = await db.report.create({
      data: {
        title: reportTitle,
        periodStart: startDate,
        periodEnd: endDate,
        contentJson: {
          stats,
          narrative,
        },
        workspaceId,
        generatedById: user.id,
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

    return NextResponse.json(newReport, { status: 201 });
  } catch (err) {
    console.error('Error generating report:', err);
    return NextResponse.json(
      { error: 'Failed to generate Voice of Customer report', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
