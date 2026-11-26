export {
  createDatabase,
  type Database,
  type DatabaseHandle,
  type DatabaseOptions,
} from './client.js';
export {
  AUDIT_ACTIONS,
  auditEvents,
  policyAcceptances,
  sessionActivity,
  userRoles,
  type AuditAction,
  type AuditDetails,
  type PolicyKindValue,
  type UserRoleValue,
} from './schema/index.js';
export { migrateDatabase } from './migrate.js';
