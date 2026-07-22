import { NextResponse } from 'next/server';

export async function GET() {
  const timestamp = new Date().toISOString();

  return NextResponse.json({
    status: 'online',
    appName: 'Zidio Next.js Platform (Frontend)',
    timestamp,
    environment: process.env.NODE_ENV || 'development',
    vercelEnv: process.env.VERCEL_ENV || 'local',
  });
}
