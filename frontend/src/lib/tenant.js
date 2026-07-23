import { db } from './db';

/**
 * Ensures any query filter object includes tenant isolation by workspaceId.
 * 
 * @param {string} workspaceId - Tenant workspace ID from session
 * @param {object} [additionalWhere={}] - Any additional Prisma query criteria
 * @returns {object} Scoped query filter object
 * 
 * @example
 * const where = scopedWhere(user.workspaceId, { status: 'NEW' });
 * // Result: { workspaceId: '...', status: 'NEW' }
 */
export function scopedWhere(workspaceId, additionalWhere = {}) {
  if (!workspaceId) {
    throw new Error('Tenant Scoping Violation: workspaceId is required for all database operations');
  }

  return {
    ...additionalWhere,
    workspaceId,
  };
}

/**
 * Creates a pre-scoped database client wrapper for a given workspaceId.
 * Guarantees strict multi-tenant isolation across queries.
 * 
 * @param {string} workspaceId - Tenant workspace ID
 */
export function tenantDb(workspaceId) {
  if (!workspaceId) {
    throw new Error('Tenant Scoping Error: Missing workspaceId');
  }

  return {
    user: {
      findMany: (args = {}) => db.user.findMany({ ...args, where: scopedWhere(workspaceId, args.where) }),
      findFirst: (args = {}) => db.user.findFirst({ ...args, where: scopedWhere(workspaceId, args.where) }),
      count: (args = {}) => db.user.count({ ...args, where: scopedWhere(workspaceId, args.where) }),
      create: (args = {}) => db.user.create({ ...args, data: { ...args.data, workspaceId } }),
      update: (args = {}) => db.user.update({ ...args, where: scopedWhere(workspaceId, args.where) }),
      delete: (args = {}) => db.user.delete({ ...args, where: scopedWhere(workspaceId, args.where) }),
    },
    feedback: {
      findMany: (args = {}) => db.feedback.findMany({ ...args, where: scopedWhere(workspaceId, args.where) }),
      findFirst: (args = {}) => db.feedback.findFirst({ ...args, where: scopedWhere(workspaceId, args.where) }),
      count: (args = {}) => db.feedback.count({ ...args, where: scopedWhere(workspaceId, args.where) }),
      create: (args = {}) => db.feedback.create({ ...args, data: { ...args.data, workspaceId } }),
    },
    theme: {
      findMany: (args = {}) => db.theme.findMany({ ...args, where: scopedWhere(workspaceId, args.where) }),
      findFirst: (args = {}) => db.theme.findFirst({ ...args, where: scopedWhere(workspaceId, args.where) }),
      create: (args = {}) => db.theme.create({ ...args, data: { ...args.data, workspaceId } }),
    },
    report: {
      findMany: (args = {}) => db.report.findMany({ ...args, where: scopedWhere(workspaceId, args.where) }),
      findFirst: (args = {}) => db.report.findFirst({ ...args, where: scopedWhere(workspaceId, args.where) }),
      create: (args = {}) => db.report.create({ ...args, data: { ...args.data, workspaceId } }),
    },
  };
}
