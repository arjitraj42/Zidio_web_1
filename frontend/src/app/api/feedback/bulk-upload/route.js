import { NextResponse } from 'next/server';
import { z } from 'zod';
import Papa from 'papaparse';
import { getSessionUser, requireRole } from '@/lib/auth';
import { tenantDb } from '@/lib/tenant';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit

// Zod schema for validating each CSV row
const csvRowSchema = z.object({
  content: z.string({ required_error: 'Content is required' })
    .trim()
    .min(1, 'Content is required and cannot be empty'),
  channel: z.string({ required_error: 'Channel is required' })
    .trim()
    .toLowerCase()
    .refine(
      (val) => ['support_ticket', 'app_review', 'nps_survey', 'sales_note', 'community_post'].includes(val),
      { message: 'Channel must be one of: support_ticket, app_review, nps_survey, sales_note, community_post' }
    ),
  customer_label: z.string().trim().optional().nullable(),
  created_at: z.string().trim().optional().nullable()
    .refine(
      (val) => {
        if (!val) return true;
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Invalid created_at date format' }
    ),
});

/**
 * POST /api/feedback/bulk-upload
 * Parses, validates, and imports feedback items from a CSV file.
 * Permitted roles: ADMIN, ANALYST.
 */
export async function POST(req) {
  const user = await getSessionUser();

  // RBAC Enforcement: Only ADMIN & ANALYST can bulk upload feedback
  const rbacError = requireRole(user, ['ADMIN', 'ANALYST']);
  if (rbacError) return rbacError;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded. Please upload a CSV file.', code: 'NO_FILE' },
        { status: 400 }
      );
    }

    // Validate wrong file type
    const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
    if (!isCsv) {
      return NextResponse.json(
        { error: 'Invalid file type. Only CSV files (.csv) are allowed.', code: 'INVALID_FILE_TYPE' },
        { status: 400 }
      );
    }

    // Validate size limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File is too large. The maximum supported file size is 2MB.', code: 'FILE_TOO_LARGE' },
        { status: 413 }
      );
    }

    // Check empty file
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'Uploaded file is empty. Please upload a valid CSV.', code: 'EMPTY_FILE' },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    if (!csvText.trim()) {
      return NextResponse.json(
        { error: 'Uploaded CSV file has no content.', code: 'EMPTY_FILE' },
        { status: 400 }
      );
    }

    // Parse CSV server-side
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
    });

    if (parsed.errors && parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'Malformed CSV structure. Failed to parse any data rows.', code: 'MALFORMED_CSV', details: parsed.errors },
        { status: 400 }
      );
    }

    // Validate headers
    const headers = parsed.meta.fields || [];
    if (!headers.includes('content') || !headers.includes('channel')) {
      return NextResponse.json(
        { error: 'Missing required columns in CSV header. The CSV must contain "content" and "channel" columns.', code: 'MISSING_HEADERS' },
        { status: 400 }
      );
    }

    const validRows = [];
    const failures = [];

    // Process rows
    for (let i = 0; i < parsed.data.length; i++) {
      const row = parsed.data[i];
      const rowNumber = i + 2; // Header is row 1, data starts at row 2

      // Check if it is a completely empty row (sometimes greedy leaves trailing spaces/commas)
      const isEmptyRow = !Object.values(row).some(x => x && x.toString().trim() !== '');
      if (isEmptyRow) {
        continue;
      }

      // Validate individual row
      const rowValidation = csvRowSchema.safeParse(row);
      if (!rowValidation.success) {
        const reason = rowValidation.error.issues.map((issue) => {
          const field = issue.path.join('.') || 'row';
          return `${field}: ${issue.message}`;
        }).join('; ');
        failures.push({ row: rowNumber, reason });
      } else {
        const { content, channel, customer_label, created_at } = rowValidation.data;

        let parsedDate = new Date();
        if (created_at) {
          const d = new Date(created_at);
          if (!isNaN(d.getTime())) {
            parsedDate = d;
          }
        }

        validRows.push({
          content: content.trim(),
          channel: channel.toLowerCase(),
          customerLabel: customer_label ? customer_label.trim() : null,
          createdAt: parsedDate,
          status: 'NEW',
        });
      }
    }

    // Bulk insert valid rows scoped to the workspace
    let importedCount = 0;
    if (validRows.length > 0) {
      const dbResult = await tenantDb(user.workspaceId).feedback.createMany({
        data: validRows,
      });
      importedCount = dbResult.count;
    }

    return NextResponse.json({
      importedCount,
      failedCount: failures.length,
      failures,
    }, { status: 200 });

  } catch (err) {
    console.error('Error handling CSV bulk upload:', err);
    return NextResponse.json(
      { error: 'An internal server error occurred during CSV import.', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
