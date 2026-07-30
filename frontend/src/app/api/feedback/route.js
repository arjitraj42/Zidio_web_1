import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';
import { feedbackFilterSchema, buildFeedbackWhereClause } from '@/lib/feedbackQuery';

// Zod Schema for feedback creation validation
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
 * Lists feedback items for the logged-in user's workspace with support for multi-field filtering, search, and pagination.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET(req) {
  const user = await getSessionUser();
  
  // RBAC Enforcement: Any valid role can read
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const { searchParams } = new URL(req.url);

    // Extract query params into raw object
    const rawParams = {
      q: searchParams.get('q') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || searchParams.get('take') || undefined,
      channel: searchParams.get('channel') || undefined,
      sentiment: searchParams.get('sentiment') || undefined,
      status: searchParams.get('status') || undefined,
      themeId: searchParams.get('themeId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    // Strict validation with Zod
    const parsed = feedbackFilterSchema.safeParse(rawParams);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        {
          error: errorMessage,
          code: 'VALIDATION_ERROR',
          details: parsed.error.format(),
        },
        { status: 400 }
      );
    }

    const { page, pageSize, ...filterValues } = parsed.data;
    const skip = (page - 1) * pageSize;

    // Construct Prisma query where clause cleanly
    const whereClause = buildFeedbackWhereClause(filterValues);

    // Query total count and items matching filters & pagination within caller's workspace
    const [total, feedbackItems] = await Promise.all([
      tenantDb(user.workspaceId).feedback.count({ where: whereClause }),
      tenantDb(user.workspaceId).feedback.findMany({
        where: whereClause,
        include: {
          themes: {
            include: {
              theme: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: pageSize,
        skip,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize) || 1;

    return NextResponse.json({
      items: feedbackItems,
      feedback: feedbackItems, // Backwards compatibility for existing caller components
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
