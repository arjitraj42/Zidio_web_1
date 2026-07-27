import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';

// Validation schema for request body
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid('Invalid ID format')).min(1, 'At least one ID is required for deletion'),
});

/**
 * POST /api/feedback/bulk-delete
 * Bulk deletes feedback items.
 * Permitted roles: ADMIN, ANALYST.
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN and ANALYST can delete feedback
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const parsed = bulkDeleteSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const { ids } = parsed.data;

    // Perform database deletion strictly scoped to the workspace (Tenant Isolation)
    const result = await tenantDb(user.workspaceId).feedback.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${result.count} feedback items.`,
      count: result.count,
    }, { status: 200 });

  } catch (err) {
    console.error('Error handling bulk feedback deletion:', err);
    return NextResponse.json(
      { error: 'An internal server error occurred while deleting feedback.', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
