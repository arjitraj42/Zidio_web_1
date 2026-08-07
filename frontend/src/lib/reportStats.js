import { db } from '@/lib/db';

/**
 * SERVER-SIDE ONLY MODULE: lib/reportStats.js
 * Computes pre-aggregated statistics, sentiment shifts, top themes, and representative verbatim quotes
 * for a workspace over a specified date range, comparing it against the prior equal-length period.
 * 
 * NO AI/Claude calls are made in this module — pure database aggregation.
 * 
 * @param {string} workspaceId - Tenant workspace ID for isolation
 * @param {Date|string} periodStartInput - Start of report date range
 * @param {Date|string} periodEndInput - End of report date range
 * @returns {Promise<object>} Structured pre-computed stats object
 */
export async function computeReportStats(workspaceId, periodStartInput, periodEndInput) {
  if (!workspaceId) {
    throw new Error('computeReportStats requires a valid workspaceId');
  }

  const periodEnd = periodEndInput ? new Date(periodEndInput) : new Date();
  const periodStart = periodStartInput
    ? new Date(periodStartInput)
    : new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const durationMs = periodEnd.getTime() - periodStart.getTime();

  // Equal-length prior period for trend comparisons
  const priorPeriodStart = new Date(periodStart.getTime() - durationMs);
  const priorPeriodEnd = new Date(periodStart.getTime());

  // 1. Total Feedback Counts
  const [currentTotal, priorTotal] = await Promise.all([
    db.feedback.count({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    }),
    db.feedback.count({
      where: {
        workspaceId,
        createdAt: { gte: priorPeriodStart, lt: priorPeriodEnd },
      },
    }),
  ]);

  let totalPercentChange = 0;
  if (priorTotal > 0) {
    totalPercentChange = Math.round(((currentTotal - priorTotal) / priorTotal) * 100);
  } else if (currentTotal > 0) {
    totalPercentChange = 100;
  }

  // 2. Sentiment Breakdown for Current Period
  const currentSentimentRows = await db.feedback.groupBy({
    by: ['sentiment'],
    where: {
      workspaceId,
      createdAt: { gte: periodStart, lte: periodEnd },
    },
    _count: { _all: true },
  });

  const currentSentimentCounts = { POS: 0, NEU: 0, NEG: 0, UNCLASSIFIED: 0 };
  currentSentimentRows.forEach((row) => {
    if (row.sentiment && currentSentimentCounts[row.sentiment] !== undefined) {
      currentSentimentCounts[row.sentiment] = row._count._all;
    } else {
      currentSentimentCounts.UNCLASSIFIED += row._count._all;
    }
  });

  // 3. Sentiment Breakdown for Prior Period
  const priorSentimentRows = await db.feedback.groupBy({
    by: ['sentiment'],
    where: {
      workspaceId,
      createdAt: { gte: priorPeriodStart, lt: priorPeriodEnd },
    },
    _count: { _all: true },
  });

  const priorSentimentCounts = { POS: 0, NEU: 0, NEG: 0, UNCLASSIFIED: 0 };
  priorSentimentRows.forEach((row) => {
    if (row.sentiment && priorSentimentCounts[row.sentiment] !== undefined) {
      priorSentimentCounts[row.sentiment] = row._count._all;
    } else {
      priorSentimentCounts.UNCLASSIFIED += row._count._all;
    }
  });

  // Calculate sentiment percentages
  const calcPercent = (count, total) => (total > 0 ? Math.round((count / total) * 100) : 0);

  const sentimentBreakdown = {
    current: {
      POS: currentSentimentCounts.POS,
      NEU: currentSentimentCounts.NEU,
      NEG: currentSentimentCounts.NEG,
      UNCLASSIFIED: currentSentimentCounts.UNCLASSIFIED,
      posPercent: calcPercent(currentSentimentCounts.POS, currentTotal),
      neuPercent: calcPercent(currentSentimentCounts.NEU, currentTotal),
      negPercent: calcPercent(currentSentimentCounts.NEG, currentTotal),
    },
    prior: {
      POS: priorSentimentCounts.POS,
      NEU: priorSentimentCounts.NEU,
      NEG: priorSentimentCounts.NEG,
      UNCLASSIFIED: priorSentimentCounts.UNCLASSIFIED,
      posPercent: calcPercent(priorSentimentCounts.POS, priorTotal),
      neuPercent: calcPercent(priorSentimentCounts.NEU, priorTotal),
      negPercent: calcPercent(priorSentimentCounts.NEG, priorTotal),
    },
    shifts: {
      posShift: calcPercent(currentSentimentCounts.POS, currentTotal) - calcPercent(priorSentimentCounts.POS, priorTotal),
      negShift: calcPercent(currentSentimentCounts.NEG, currentTotal) - calcPercent(priorSentimentCounts.NEG, priorTotal),
    },
  };

  // 4. Top Themes by Volume in Current Period vs Prior Period
  const workspaceThemes = await db.theme.findMany({
    where: { workspaceId },
    select: { id: true, name: true, color: true, description: true },
  });

  const [currentThemeRows, priorThemeRows] = await Promise.all([
    db.feedbackTheme.findMany({
      where: {
        theme: { workspaceId },
        feedback: { workspaceId, createdAt: { gte: periodStart, lte: periodEnd } },
      },
      select: { themeId: true },
    }),
    db.feedbackTheme.findMany({
      where: {
        theme: { workspaceId },
        feedback: { workspaceId, createdAt: { gte: priorPeriodStart, lt: priorPeriodEnd } },
      },
      select: { themeId: true },
    }),
  ]);

  const currentThemeCounts = {};
  const priorThemeCounts = {};

  workspaceThemes.forEach((t) => {
    currentThemeCounts[t.id] = 0;
    priorThemeCounts[t.id] = 0;
  });

  currentThemeRows.forEach((r) => {
    currentThemeCounts[r.themeId] = (currentThemeCounts[r.themeId] || 0) + 1;
  });

  priorThemeRows.forEach((r) => {
    priorThemeCounts[r.themeId] = (priorThemeCounts[r.themeId] || 0) + 1;
  });

  const topThemes = workspaceThemes
    .map((t) => {
      const count = currentThemeCounts[t.id] || 0;
      const priorCount = priorThemeCounts[t.id] || 0;

      let percentChange = 0;
      if (priorCount > 0) {
        percentChange = Math.round(((count - priorCount) / priorCount) * 100);
      } else if (count > 0) {
        percentChange = 100;
      }

      return {
        themeId: t.id,
        name: t.name,
        color: t.color || '#6366F1',
        description: t.description,
        count,
        priorCount,
        percentChange,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 5. Representative Verbatim Quotes (Real stored content from current period)
  // Fetch top negative, top positive, and recent items
  const [negativeVerbatims, positiveVerbatims, recentVerbatims] = await Promise.all([
    db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: periodEnd },
        sentiment: 'NEG',
      },
      select: { id: true, content: true, channel: true, customerLabel: true, sentiment: true, sentimentScore: true, createdAt: true },
      orderBy: { sentimentScore: 'asc' },
      take: 2,
    }),
    db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: periodEnd },
        sentiment: 'POS',
      },
      select: { id: true, content: true, channel: true, customerLabel: true, sentiment: true, sentimentScore: true, createdAt: true },
      orderBy: { sentimentScore: 'desc' },
      take: 2,
    }),
    db.feedback.findMany({
      where: {
        workspaceId,
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: { id: true, content: true, channel: true, customerLabel: true, sentiment: true, sentimentScore: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
  ]);

  // Combine and deduplicate verbatim quotes
  const quoteMap = new Map();
  [...negativeVerbatims, ...positiveVerbatims, ...recentVerbatims].forEach((item) => {
    if (!quoteMap.has(item.id)) {
      quoteMap.set(item.id, {
        id: item.id,
        content: item.content,
        channel: item.channel,
        customerLabel: item.customerLabel,
        sentiment: item.sentiment || 'NEU',
        createdAt: item.createdAt,
      });
    }
  });

  const representativeQuotes = Array.from(quoteMap.values()).slice(0, 5);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    durationDays: Math.round(durationMs / (24 * 60 * 60 * 1000)),
    totalFeedback: {
      current: currentTotal,
      prior: priorTotal,
      percentChange: totalPercentChange,
    },
    sentimentBreakdown,
    topThemes,
    representativeQuotes,
  };
}
