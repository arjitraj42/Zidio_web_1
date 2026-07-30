import { z } from 'zod';

const sentimentEnum = z.enum(['POS', 'NEU', 'NEG'], {
  errorMap: () => ({ message: 'Invalid sentiment value. Must be POS, NEU, or NEG.' }),
});

const statusEnum = z.enum(['NEW', 'REVIEWED', 'ACTIONED'], {
  errorMap: () => ({ message: 'Invalid status value. Must be NEW, REVIEWED, or ACTIONED.' }),
});

/**
 * Splits string by comma into clean trimmed array
 */
const parseCommaSeparatedString = (val) => {
  if (!val) return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    const list = val.split(',').map((s) => s.trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  return undefined;
};

/**
 * Zod Schema for feedback search, pagination, and multi-field filters
 */
export const feedbackFilterSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.coerce.number().int().min(1, 'Page size must be at least 1').max(100, 'Page size max is 100').default(20),
  channel: z
    .union([z.string(), z.array(z.string())])
    .transform(parseCommaSeparatedString)
    .optional(),
  sentiment: z
    .union([z.string(), z.array(z.string())])
    .transform(parseCommaSeparatedString)
    .pipe(z.array(sentimentEnum).optional())
    .optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .transform(parseCommaSeparatedString)
    .pipe(z.array(statusEnum).optional())
    .optional(),
  themeId: z.string().trim().min(1).optional(),
  dateFrom: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string for dateFrom',
    })
    .optional(),
  dateTo: z
    .string()
    .trim()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: 'Invalid ISO date string for dateTo',
    })
    .optional(),
});

/**
 * Cleanly constructs a Prisma `where` clause object from validated filter parameters.
 * Avoids nested ternaries by appending clauses incrementally.
 * 
 * @param {Object} filters - Validated filter parameters
 * @returns {Object} Prisma where filter object
 */
export function buildFeedbackWhereClause(filters = {}) {
  const where = {};

  // Search query (content matching)
  if (filters.q && filters.q.trim()) {
    where.content = {
      contains: filters.q.trim(),
      mode: 'insensitive',
    };
  }

  // Channel filter (single value or list)
  if (filters.channel && filters.channel.length > 0) {
    where.channel = filters.channel.length === 1 ? filters.channel[0] : { in: filters.channel };
  }

  // Sentiment filter (single value or list)
  if (filters.sentiment && filters.sentiment.length > 0) {
    where.sentiment = filters.sentiment.length === 1 ? filters.sentiment[0] : { in: filters.sentiment };
  }

  // Status filter (single value or list)
  if (filters.status && filters.status.length > 0) {
    where.status = filters.status.length === 1 ? filters.status[0] : { in: filters.status };
  }

  // Theme filter (join relation via FeedbackTheme)
  if (filters.themeId) {
    where.themes = {
      some: {
        themeId: filters.themeId,
      },
    };
  }

  // Date range filter (createdAt)
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) {
      where.createdAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      const dateToObj = new Date(filters.dateTo);
      // Handle YYYY-MM-DD formatted strings by extending to end-of-day (23:59:59.999)
      if (filters.dateTo.length === 10) {
        dateToObj.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = dateToObj;
    }
  }

  return where;
}
