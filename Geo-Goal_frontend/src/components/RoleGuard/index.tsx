import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";

type RoleGuardProps = {
  allowedRoles: Role[];
  children: React.ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { data: user } = useAuth();
  const role = (user?.role as Role) || "";
  const allowed = allowedRoles.includes(role);
  if (!allowed) return <Navigate to="/" replace />;
  return <>{children}</>;
}
