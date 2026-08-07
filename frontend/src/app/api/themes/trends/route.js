import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/themes/trends
 * Returns time-series breakdown and spike detection analytics for workspace themes over a configurable period.
 * 
 * Query parameters:
 * - periodDays: number of days to analyze (default: 7).
 *   Compares Current Period [now - periodDays, now] vs Previous Period [now - 2*periodDays, now - periodDays).
 * 
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Available to all three roles
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const { searchParams } = new URL(req.url);
    const rawPeriodDays = parseInt(searchParams.get('periodDays') || '7', 10);
    const periodDays = isNaN(rawPeriodDays) || rawPeriodDays <= 0 ? 7 : Math.min(90, rawPeriodDays);

    const workspaceId = user.workspaceId;
    const now = new Date();

    // Compute period boundaries
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000);

    // 1. Fetch all themes belonging to the caller's workspace
    const workspaceThemes = await db.theme.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
      },
    });

    if (workspaceThemes.length === 0) {
      return NextResponse.json({
        periodDays,
        themes: [],
        spikes: [],
        timeSeries: [],
        topThemes: [],
        totalPeriodFeedback: 0,
      });
    }

    // 2. Fetch all FeedbackTheme join records within the past 2 * periodDays
    const feedbackThemeRows = await db.feedbackTheme.findMany({
      where: {
        theme: { workspaceId },
        feedback: {
          workspaceId,
          createdAt: {
            gte: previousPeriodStart,
          },
        },
      },
      select: {
        themeId: true,
        feedback: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
    });

    // Maps to track counts per theme for current and previous periods
    const currentCounts = {};
    const previousCounts = {};

    workspaceThemes.forEach((t) => {
      currentCounts[t.id] = 0;
      previousCounts[t.id] = 0;
    });

    feedbackThemeRows.forEach((row) => {
      const createdAt = new Date(row.feedback.createdAt);
      if (createdAt >= currentPeriodStart) {
        currentCounts[row.themeId] = (currentCounts[row.themeId] || 0) + 1;
      } else if (createdAt >= previousPeriodStart && createdAt < currentPeriodStart) {
        previousCounts[row.themeId] = (previousCounts[row.themeId] || 0) + 1;
      }
    });

    // 3. Compute metrics and spike detection for each theme
    // Sensible defaults: percentChange >= 50% AND currentCount >= 3 (avoids false positives on tiny samples like 0 -> 1)
    const SPIKE_PERCENT_THRESHOLD = 50;
    const SPIKE_MIN_COUNT_THRESHOLD = 3;

    const themeMetrics = workspaceThemes.map((t) => {
      const currentCount = currentCounts[t.id] || 0;
      const previousCount = previousCounts[t.id] || 0;

      let percentChange = 0;
      let isNew = false;

      if (previousCount === 0) {
        if (currentCount > 0) {
          percentChange = 100;
          isNew = true;
        } else {
          percentChange = 0;
        }
      } else {
        percentChange = Math.round(((currentCount - previousCount) / previousCount) * 100);
      }

      const isSpike =
        percentChange >= SPIKE_PERCENT_THRESHOLD &&
        currentCount >= SPIKE_MIN_COUNT_THRESHOLD;

      return {
        themeId: t.id,
        name: t.name,
        description: t.description,
        color: t.color || '#6366F1',
        currentCount,
        previousCount,
        percentChange,
        isNew,
        isSpike,
      };
    });

    // Sort themes by currentCount descending
    themeMetrics.sort((a, b) => b.currentCount - a.currentCount);

    // Filter themes flagging as spikes
    const spikes = themeMetrics.filter((t) => t.isSpike);

    // 4. Generate daily time-series data for the top N themes (up to top 5)
    const topThemes = themeMetrics.slice(0, 5).filter((t) => t.currentCount > 0 || workspaceThemes.length <= 5);
    const topThemeIds = new Set(topThemes.map((t) => t.themeId));

    // Construct array of date keys YYYY-MM-DD for each day in current period
    const dateMap = {};
    const dateList = [];

    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      const displayLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      dateList.push({ dateKey, displayLabel });
      dateMap[dateKey] = {
        date: displayLabel,
        fullDate: dateKey,
      };

      // Initialize counts for each top theme to 0
      topThemes.forEach((t) => {
        dateMap[dateKey][t.name] = 0;
      });
    }

    // Populate daily counts for top themes from feedbackThemeRows
    feedbackThemeRows.forEach((row) => {
      const createdAt = new Date(row.feedback.createdAt);
      if (createdAt >= currentPeriodStart && topThemeIds.has(row.themeId)) {
        const dateKey = createdAt.toISOString().split('T')[0];
        if (dateMap[dateKey]) {
          const themeName = workspaceThemes.find((t) => t.id === row.themeId)?.name;
          if (themeName) {
            dateMap[dateKey][themeName] = (dateMap[dateKey][themeName] || 0) + 1;
          }
        }
      }
    });

    const timeSeries = dateList.map((item) => dateMap[item.dateKey]);

    const totalPeriodFeedback = themeMetrics.reduce((acc, t) => acc + t.currentCount, 0);

    return NextResponse.json({
      periodDays,
      themes: themeMetrics,
      spikes,
      timeSeries,
      topThemes: topThemes.map((t) => ({
        themeId: t.themeId,
        name: t.name,
        color: t.color,
        currentCount: t.currentCount,
      })),
      totalPeriodFeedback,
    });
  } catch (err) {
    console.error('Error computing theme trends:', err);
    return NextResponse.json(
      { error: 'Failed to compute theme trends', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
