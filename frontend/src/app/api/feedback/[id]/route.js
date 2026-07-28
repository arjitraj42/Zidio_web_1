import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';

// Schema validation for updating feedback status
const updateStatusSchema = z.object({
  status: z.enum(['NEW', 'REVIEWED', 'ACTIONED'], {
    errorMap: () => ({ message: 'Status must be one of NEW, REVIEWED, or ACTIONED' }),
  }),
});

/**
 * PATCH /api/feedback/[id]
 * Updates a feedback item's status (NEW | REVIEWED | ACTIONED).
 * Permitted roles: ADMIN, ANALYST. VIEWER gets 403 Forbidden.
 */
export async function PATCH(req, { params }) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN & ANALYST can update feedback status
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  const { id } = params;

  if (!id) {
    return NextResponse.json(
      { error: 'Feedback ID parameter is required', code: 'INVALID_ID' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { status } = parsed.data;

    // Verify existing item belongs to caller's workspace (Cross-Tenant Security Check)
    const existingItem = await tenantDb(user.workspaceId).feedback.findFirst({
      where: { id },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Feedback item not found in your workspace', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Update status in PostgreSQL DB scoped by workspaceId
    const updatedFeedback = await tenantDb(user.workspaceId).feedback.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updatedFeedback);
  } catch (err) {
    console.error(`Error updating status for feedback ${id}:`, err);
    return NextResponse.json(
      { error: 'Failed to update feedback status', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
