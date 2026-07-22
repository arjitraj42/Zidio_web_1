import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const timestamp = new Date().toISOString();
  let dbStatus = 'disconnected';
  let dbError = null;

  try {
    // Attempt a raw ping query to verify PostgreSQL connection
    await db.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'unreachable';
    dbError = err.message || 'Could not reach PostgreSQL instance';
  }

  return NextResponse.json({
    status: 'online',
    appName: 'Zidio Next.js Platform',
    timestamp,
    environment: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV || 'local',
    database: {
      provider: 'postgresql',
      status: dbStatus,
      error: dbError,
    },
  });
}
