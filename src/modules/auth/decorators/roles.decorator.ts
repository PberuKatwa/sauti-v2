import { SetMetadata } from "@nestjs/common";
import { UserRoles } from "../../../types/authSession.types"

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRoles[]) => SetMetadata(ROLES_KEY, roles);
