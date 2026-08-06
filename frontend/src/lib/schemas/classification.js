import { z } from 'zod';

/**
 * Zod schema for feedback classification result.
 * Used by Claude AI classification service layer and feedback ingestion pipeline.
 */
export const classificationSchema = z.object({
  sentiment: z.enum(['POS', 'NEU', 'NEG'], {
    errorMap: () => ({ message: 'Sentiment must be one of: POS, NEU, NEG' }),
  }),
  sentimentScore: z
    .number({
      required_error: 'Sentiment score is required',
      invalid_type_error: 'Sentiment score must be a number',
    })
    .min(-1, 'Sentiment score must be between -1 and 1')
    .max(1, 'Sentiment score must be between -1 and 1'),
  themes: z
    .array(z.string().min(1, 'Theme name cannot be empty'))
    .min(1, 'At least one theme must be provided'),
  featureArea: z.string().min(1, 'Feature area cannot be empty'),
  rationale: z.string().min(1, 'Rationale cannot be empty'),
});
