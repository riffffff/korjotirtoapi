import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify required roles for accessing a route
 * @param roles - Array of UserRole that can access the route
 * 
 * @example
 * @Roles(UserRole.ADMIN) // Only admin can access
 * @Roles(UserRole.ADMIN, UserRole.OPERATOR) // Admin or operator can access
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
