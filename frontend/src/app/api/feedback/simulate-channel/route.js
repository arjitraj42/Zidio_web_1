import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';
import { cannedFeedback } from '@/lib/cannedFeedback';

// Schema validation for input channel
const simulateChannelSchema = z.object({
  channel: z.enum(['app_review', 'support_ticket', 'sales_note'], {
    errorMap: () => ({ message: 'Invalid channel. Must be one of app_review, support_ticket, or sales_note' }),
  }),
});

/**
 * POST /api/feedback/simulate-channel
 * Simulates importing feedback items from a specific touchpoint channel.
 * Permitted roles: ADMIN, ANALYST.
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN & ANALYST can trigger integrations simulation
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const parsed = simulateChannelSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { channel } = parsed.data;
    const pool = cannedFeedback[channel];

    if (!pool || pool.length === 0) {
      return NextResponse.json(
        { error: `No canned feedback items found for channel ${channel}`, code: 'EMPTY_POOL' },
        { status: 400 }
      );
    }

    // Pick a random count of items between 5 and 10
    const count = Math.floor(Math.random() * 6) + 5; // 5 to 10

    // Shuffle the pool and select the items
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    // Map feedback entries with historical timestamps randomized over the last 5 days
    const feedbackItems = selected.map((item) => {
      // Random offset in milliseconds between 0 and 5 days (5 * 24 * 60 * 60 * 1000)
      const offsetMs = Math.floor(Math.random() * 5 * 24 * 60 * 60 * 1000);
      const createdAt = new Date(Date.now() - offsetMs);

      return {
        content: item.content.trim(),
        channel,
        customerLabel: item.customerLabel ? item.customerLabel.trim() : null,
        sourceRef: `simulated:${channel}`,
        status: 'NEW',
        createdAt,
      };
    });

    // Write to PostgreSQL database scoped by current workspace
    const result = await tenantDb(user.workspaceId).feedback.createMany({
      data: feedbackItems,
    });

    return NextResponse.json({
      message: `Successfully simulated import of ${result.count} items.`,
      channel,
      count: result.count,
    }, { status: 201 });

  } catch (err) {
    console.error('Error simulating channel integration:', err);
    return NextResponse.json(
      { error: 'An internal server error occurred while simulating the integration channel.', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
