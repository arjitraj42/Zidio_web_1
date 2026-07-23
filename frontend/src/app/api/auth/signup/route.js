import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
});

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Zod Validation
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map((issue) => issue.message).join(', ');
      return NextResponse.json(
        { error: errorMessages || 'Invalid input data' },
        { status: 400 }
      );
    }

    const { name, email, password, workspaceName } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email address already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Workspace and User (ADMIN) in a single Prisma transaction
    const { workspace, user } = await db.$transaction(async (tx) => {
      const newWorkspace = await tx.workspace.create({
        data: {
          name: workspaceName.trim(),
        },
      });

      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: 'ADMIN', // Signing-up user automatically becomes ADMIN
          workspaceId: newWorkspace.id,
        },
      });

      return { workspace: newWorkspace, user: newUser };
    });

    return NextResponse.json(
      {
        message: 'Workspace and user created successfully',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'An error occurred during account registration' },
      { status: 500 }
    );
  }
}
