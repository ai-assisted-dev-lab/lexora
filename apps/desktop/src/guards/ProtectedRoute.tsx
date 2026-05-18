import { Outlet } from "react-router-dom";

/**
 * Placeholder auth guard. When real auth is implemented, check the auth
 * store here and replace <Outlet /> with <Navigate to="/login" replace />
 * when the user is not authenticated.
 */
export function ProtectedRoute() {
  return <Outlet />;
}
