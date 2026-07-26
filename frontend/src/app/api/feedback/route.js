import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';

// Zod Schema for feedback validation
const createFeedbackSchema = z.object({
  content: z.string().trim().min(1, 'Feedback content is required and cannot be empty'),
  channel: z.enum(
    ['support_ticket', 'app_review', 'nps_survey', 'sales_note', 'community_post'],
    { errorMap: () => ({ message: 'Invalid channel select value' }) }
  ),
  customerLabel: z.string().trim().optional().nullable(),
});

/**
 * GET /api/feedback
 * Lists feedback items for the logged-in user's workspace only.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET(req) {
  const user = await getSessionUser();
  
  // RBAC Enforcement: Any valid role can read
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const { searchParams } = new URL(req.url);
    const takeParam = searchParams.get('take');
    const skipParam = searchParams.get('skip');

    // Sane defaults for pagination
    let take = 20;
    let skip = 0;

    if (takeParam) {
      const parsedTake = parseInt(takeParam, 10);
      if (!isNaN(parsedTake) && parsedTake > 0) {
        take = parsedTake;
      }
    }

    if (skipParam) {
      const parsedSkip = parseInt(skipParam, 10);
      if (!isNaN(parsedSkip) && parsedSkip >= 0) {
        skip = parsedSkip;
      }
    }

    // Query database with strict workspace isolation (tenantDb helper)
    const feedbackItems = await tenantDb(user.workspaceId).feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    });

    const total = await tenantDb(user.workspaceId).feedback.count();

    return NextResponse.json({
      feedback: feedbackItems,
      pagination: {
        total,
        take,
        skip,
      },
    });
  } catch (err) {
    console.error('Error fetching feedback items:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve feedback items', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback
 * Creates a single feedback item scoped to the user's workspace.
 * Permitted roles: ADMIN, ANALYST.
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN & ANALYST can create feedback
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const parsed = createFeedbackSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { content, channel, customerLabel } = parsed.data;

    // Create feedback scoped to the caller's workspaceId (Tenant Isolation)
    const newFeedback = await tenantDb(user.workspaceId).feedback.create({
      data: {
        content: content.trim(),
        channel,
        customerLabel: customerLabel ? customerLabel.trim() : null,
        status: 'NEW',
        sentiment: null,
        sentimentScore: null,
      },
    });

    return NextResponse.json(newFeedback, { status: 201 });
  } catch (err) {
    console.error('Error creating feedback item:', err);
    return NextResponse.json(
      { error: 'Failed to create feedback item', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
