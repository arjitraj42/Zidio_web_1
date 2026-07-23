import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser, requireRole } from '@/lib/auth';
import { scopedWhere } from '@/lib/tenant';

// Zod Schema for Adding / Inviting Member
const createMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().default('demo1234'),
  role: z.enum(['ADMIN', 'ANALYST', 'VIEWER']).default('VIEWER'),
});

/**
 * GET /api/workspace/members
 * Returns all members in the caller's workspace. (ADMIN ONLY)
 */
export async function GET() {
  const user = await getSessionUser();
  
  // RBAC Enforcement: Only ADMIN can view member list
  const rbacError = requireRole(user, ['ADMIN']);
  if (rbacError) return rbacError;

  try {
    const members = await db.user.findMany({
      where: scopedWhere(user.workspaceId),
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ members });
  } catch (err) {
    console.error('Error fetching members:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve workspace members', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workspace/members
 * Creates/Invites a new member into the caller's workspace. (ADMIN ONLY)
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN can create members
  const rbacError = requireRole(user, ['ADMIN']);
  if (rbacError) return rbacError;

  try {
    const body = await req.json();
    const parsed = createMemberSchema.safeParse(body);

    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json({ error: errorMessage, code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const { name, email, password, role } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check system-wide email uniqueness
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists', code: 'EMAIL_ALREADY_EXISTS' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Create user directly in the caller's workspaceId (Tenant Isolation)
    const newMember = await db.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        workspaceId: user.workspaceId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        workspaceId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { message: 'Member created successfully', member: newMember },
      { status: 201 }
    );
  } catch (err) {
    console.error('Error creating member:', err);
    return NextResponse.json(
      { error: 'Failed to create workspace member', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
