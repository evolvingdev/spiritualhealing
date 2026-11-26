import { Inject, Injectable } from '@nestjs/common';
import type { Role, UserId } from '@spiritualhealing/domain';
import { managedUserResponseSchema, type ManagedUserResponse } from '@spiritualhealing/shared';
import type { AuthContext } from '../auth/auth-context.js';
import { NotFoundError } from '../common/errors/app-error.js';
import { AdminUsersRepository } from './admin-users.repository.js';

/** The only role admins manage in the app; `admin` itself is granted by runbook (ADR 0022). */
export const ADMIN_MANAGED_ROLE: Role = 'practitioner';

@Injectable()
export class AdminUsersService {
  constructor(@Inject(AdminUsersRepository) private readonly users: AdminUsersRepository) {}

  /** Looking someone up is access to personal data, so it is audited even though nothing changes. */
  async lookUpByEmail(
    admin: AuthContext,
    email: string,
    correlationId: string,
  ): Promise<ManagedUserResponse> {
    const userId = await this.users.findUserIdByEmail(email);
    if (userId === null) {
      throw new NotFoundError('No user with that email');
    }
    await this.users.recordAuditEvent({
      action: 'admin.user_looked_up',
      actorUserId: admin.userId,
      targetUserId: userId,
      correlationId,
    });
    return this.describe(userId);
  }

  async grantPractitioner(
    admin: AuthContext,
    targetUserId: UserId,
    correlationId: string,
  ): Promise<ManagedUserResponse> {
    await this.users.grantRole({
      role: ADMIN_MANAGED_ROLE,
      actorUserId: admin.userId,
      targetUserId,
      correlationId,
    });
    return this.describe(targetUserId);
  }

  async revokePractitioner(
    admin: AuthContext,
    targetUserId: UserId,
    correlationId: string,
  ): Promise<ManagedUserResponse> {
    await this.users.revokeRole({
      role: ADMIN_MANAGED_ROLE,
      actorUserId: admin.userId,
      targetUserId,
      correlationId,
    });
    return this.describe(targetUserId);
  }

  private async describe(userId: UserId): Promise<ManagedUserResponse> {
    return managedUserResponseSchema.parse({ userId, roles: await this.users.findRoles(userId) });
  }
}
