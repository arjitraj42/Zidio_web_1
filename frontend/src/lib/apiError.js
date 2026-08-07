import { NextResponse } from 'next/server';

/**
 * Standardized API Error Response Helper for Project LOOP.
 * Ensures consistent JSON error payloads across all Next.js App Router API endpoints.
 * 
 * @param {string} message - Human-readable error message
 * @param {number} [status=500] - HTTP Status Code (400, 401, 403, 404, 500)
 * @param {string} [code='INTERNAL_SERVER_ERROR'] - Machine-readable error code
 * @param {object|null} [details=null] - Optional detailed validation or context object
 * @returns {NextResponse} Standardized NextResponse JSON payload
 */
export function apiError(
  message = 'An unexpected server error occurred',
  status = 500,
  code = 'INTERNAL_SERVER_ERROR',
  details = null
) {
  const payload = {
    error: message,
    code,
  };

  if (details) {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}

/**
 * Helper for 400 Bad Request / Validation errors
 */
export function badRequest(message = 'Invalid request parameters', details = null) {
  return apiError(message, 400, 'VALIDATION_ERROR', details);
}

/**
 * Helper for 401 Unauthenticated errors
 */
export function unauthorized(message = 'Authentication required to access this resource') {
  return apiError(message, 401, 'UNAUTHORIZED');
}

/**
 * Helper for 403 Forbidden / RBAC errors
 */
export function forbidden(message = 'You do not have permission to perform this action', requiredRoles = null, currentRole = null) {
  const details = requiredRoles ? { requiredRoles, currentRole } : null;
  return apiError(message, 403, 'FORBIDDEN', details);
}

/**
 * Helper for 404 Not Found errors
 */
export function notFound(message = 'The requested resource was not found') {
  return apiError(message, 404, 'NOT_FOUND');
}

/**
 * Helper for 500 Internal Server errors
 */
export function internalError(message = 'Internal server error', err = null) {
  if (err) {
    console.error('[API Internal Error]:', err);
  }
  return apiError(message, 500, 'INTERNAL_SERVER_ERROR');
}
