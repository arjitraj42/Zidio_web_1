import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { NextResponse } from 'next/server';
import { db } from './db';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error('Invalid input format');
        }

        const { email, password } = parsed.data;

        // Fetch user from Postgres along with Workspace
        const user = await db.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { workspace: true },
        });

        if (!user) {
          throw new Error('Invalid email or password');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          workspaceId: user.workspaceId,
          workspaceName: user.workspace?.name || 'Workspace',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days persistence
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
        token.workspaceName = user.workspaceName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.workspaceId = token.workspaceId;
        session.user.workspaceName = token.workspaceName;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || 'project-loop-secret-key-2026',
};

/**
 * Reads the authenticated session user server-side.
 * Works inside Next.js API Route Handlers and Server Components.
 * @returns {Promise<{id: string, email: string, name: string, role: string, workspaceId: string, workspaceName: string} | null>}
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return null;
  }
  return session.user;
}

/**
 * Enforces Role-Based Access Control (RBAC).
 * Returns null if user is authorized, or a standard 403/401 NextResponse if blocked.
 * 
 * @param {object} user - User session object from getSessionUser()
 * @param {string[]} allowedRoles - Array of permitted roles, e.g. ['ADMIN', 'ANALYST']
 * @returns {NextResponse | null}
 */
export function requireRole(user, allowedRoles = []) {
  if (!user) {
    return NextResponse.json(
      {
        error: 'Unauthorized: Authentication required to access this resource',
        code: 'UNAUTHORIZED',
      },
      { status: 401 }
    );
  }

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      {
        error: 'Forbidden: You do not have permission to perform this action',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        currentRole: user.role,
      },
      { status: 403 }
    );
  }

  return null;
}
