import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "@/store/authContext";

export function OwnerRoute() {
  const { user } = useAuth();

  if (user?.role !== "owner") return <Navigate to="/discover" replace />;
  return <Outlet />;
}
