import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";

type RoleGuardProps = {
  allowedRoles: Role[];
  children: React.ReactNode;
};

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { data: user, isLoading } = useAuth();
  const role = (user?.role as Role) || "";
  const allowed = allowedRoles.includes(role);

  if (isLoading) return null;
  if (!user) return <Navigate to="/public" replace />;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
