import { NextResponse } from 'next/server';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';
import { db } from '@/lib/db';
import { feedbackFilterSchema, buildFeedbackWhereClause } from '@/lib/feedbackQuery';

/**
 * GET /api/dashboard/summary
 * Returns workspace dashboard metrics: stat cards, volume over time,
 * sentiment breakdown (with unclassified), and top themes.
 * Permitted roles: ADMIN, ANALYST, VIEWER.
 */
export async function GET(req) {
  const user = await getSessionUser();

  // RBAC Enforcement
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST', 'VIEWER']);
  if (rbacError) return rbacError;

  try {
    const workspaceId = user.workspaceId;
    const { searchParams } = new URL(req.url);

    // Extract & validate filter query params
    const rawParams = {
      q: searchParams.get('q') || undefined,
      channel: searchParams.get('channel') || undefined,
      sentiment: searchParams.get('sentiment') || undefined,
      status: searchParams.get('status') || undefined,
      themeId: searchParams.get('themeId') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const parsed = feedbackFilterSchema.safeParse(rawParams);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { error: errorMessage, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const filterValues = parsed.data;
    const whereClause = buildFeedbackWhereClause(filterValues);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Run parallel queries for dashboard summary
    const [totalItems, newThisWeek, totalMembers, feedbackData, themesData] =
      await Promise.all([
        // 1. Total Feedback count matching filters
        tenantDb(workspaceId).feedback.count({ where: whereClause }),

        // 2. New Feedback in the last 7 days
        tenantDb(workspaceId).feedback.count({
          where: {
            ...whereClause,
            createdAt: { gte: sevenDaysAgo },
          },
        }),

        // 3. Workspace member count
        tenantDb(workspaceId).user.count(),

        // 4. Feedback createdAt and sentiment for volume & sentiment breakdown
        tenantDb(workspaceId).feedback.findMany({
          where: whereClause,
          select: {
            id: true,
            createdAt: true,
            sentiment: true,
          },
          orderBy: { createdAt: 'asc' },
        }),

        // 5. Top Themes ranking
        db.theme.findMany({
          where: { workspaceId },
          select: {
            id: true,
            name: true,
            color: true,
            _count: {
              select: { feedback: true },
            },
          },
          orderBy: {
            feedback: {
              _count: 'desc',
            },
          },
          take: 8,
        }),
      ]);

    // Compute Sentiment Breakdown
    let posCount = 0;
    let neuCount = 0;
    let negCount = 0;
    let unclassifiedCount = 0;

    // Grouping dates for Volume over Time
    const dateCountsMap = {};

    feedbackData.forEach((item) => {
      // Sentiment breakdown
      if (item.sentiment === 'POS') posCount++;
      else if (item.sentiment === 'NEU') neuCount++;
      else if (item.sentiment === 'NEG') negCount++;
      else unclassifiedCount++;

      // Date key (YYYY-MM-DD)
      const dateKey = new Date(item.createdAt).toISOString().split('T')[0];
      dateCountsMap[dateKey] = (dateCountsMap[dateKey] || 0) + 1;
    });

    const classifiedTotal = posCount + neuCount + negCount;
    const percentClassified = totalItems > 0 ? Math.round((classifiedTotal / totalItems) * 100) : 0;
    const percentNegative =
      classifiedTotal > 0 ? Math.round((negCount / classifiedTotal) * 100) : 0;

    const sentimentBreakdown = [
      { sentiment: 'POS', label: 'Positive', count: posCount, color: '#10B981' },
      { sentiment: 'NEU', label: 'Neutral', count: neuCount, color: '#F59E0B' },
      { sentiment: 'NEG', label: 'Negative', count: negCount, color: '#F43F5E' },
      { sentiment: 'UNCLASSIFIED', label: 'Unclassified', count: unclassifiedCount, color: '#64748B' },
    ];

    // Build continuous daily time series for volume over time
    let volumeOverTime = [];
    const dates = Object.keys(dateCountsMap).sort();

    if (dates.length > 0) {
      const startDate = new Date(dates[0]);
      const endDate = new Date(dates[dates.length - 1]);

      // Ensure at least 7 days span for visual aesthetics
      if ((endDate - startDate) / (1000 * 60 * 60 * 24) < 6) {
        startDate.setDate(endDate.getDate() - 6);
      }

      const curr = new Date(startDate);
      while (curr <= endDate) {
        const dStr = curr.toISOString().split('T')[0];
        const displayLabel = curr.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        volumeOverTime.push({
          date: dStr,
          label: displayLabel,
          count: dateCountsMap[dStr] || 0,
        });
        curr.setDate(curr.getDate() + 1);
      }
    } else {
      // Default empty 7-day placeholder series if zero feedback
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        volumeOverTime.push({
          date: d.toISOString().split('T')[0],
          label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
          count: 0,
        });
      }
    }

    // Format top themes ranking
    const topThemes = themesData
      .map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || '#6366F1',
        count: t._count.feedback,
      }))
      .filter((t) => t.count > 0);

    return NextResponse.json({
      summary: {
        totalItems,
        percentNegative,
        newThisWeek,
        totalMembers,
        classifiedTotal,
        percentClassified,
      },
      volumeOverTime,
      sentimentBreakdown,
      topThemes,
    });
  } catch (err) {
    console.error('Error in GET /api/dashboard/summary:', err);
    return NextResponse.json(
      { error: 'Failed to generate dashboard summary', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
