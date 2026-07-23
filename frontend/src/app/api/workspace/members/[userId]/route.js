import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser, requireRole } from '@/lib/auth';
import { scopedWhere } from '@/lib/tenant';

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, ANALYST, or VIEWER' }),
  }),
});

/**
 * PATCH /api/workspace/members/[userId]
 * Updates another member's role within the SAME workspace. (ADMIN ONLY)
 */
export async function PATCH(req, { params }) {
  const user = await getSessionUser();

  // 1. RBAC Enforcement: Only ADMIN can change member roles
  const rbacError = requireRole(user, ['ADMIN']);
  if (rbacError) return rbacError;

  const { userId } = await params;

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required', code: 'BAD_REQUEST' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errorMessage, code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { role } = parsed.data;

    // 2. Strict Cross-Tenant Check: Ensure target user belongs to caller's workspaceId
    const targetUser = await db.user.findFirst({
      where: scopedWhere(user.workspaceId, { id: userId }),
    });

    if (!targetUser) {
      return NextResponse.json(
        {
          error: 'Forbidden: Target user does not belong to your workspace',
          code: 'TENANT_MISMATCH_OR_NOT_FOUND',
        },
        { status: 403 }
      );
    }

    // 3. Update target user's role
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        workspaceId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: 'Member role updated successfully',
      member: updatedUser,
    });
  } catch (err) {
    console.error('Error updating member role:', err);
    return NextResponse.json(
      { error: 'Failed to update member role', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
