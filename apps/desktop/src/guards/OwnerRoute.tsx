import { Outlet } from "react-router-dom";

/**
 * Placeholder owner guard. When real auth is implemented, check the user
 * role here and replace <Outlet /> with <Navigate to="/discover" replace />
 * when the user does not have the owner role.
 */
export function OwnerRoute() {
  return <Outlet />;
}
