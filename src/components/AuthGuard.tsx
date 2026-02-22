import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/auth";

export default function AuthGuard() {
  const { isLoading, session } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
