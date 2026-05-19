import { Outlet } from "react-router-dom";

import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { useAuth } from "@/store/authContext";

export function OwnerRoute() {
  const { user } = useAuth();

  if (!user || user.role !== "owner") return <UnauthorizedPage />;
  return <Outlet />;
}
