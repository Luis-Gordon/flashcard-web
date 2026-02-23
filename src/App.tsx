import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";
import AppLayout from "@/routes/app/AppLayout";

// Lazy-loaded route pages — each becomes its own chunk
const Landing = lazy(() => import("@/routes/Landing"));
const Pricing = lazy(() => import("@/routes/Pricing"));
const Privacy = lazy(() => import("@/routes/Privacy"));
const Terms = lazy(() => import("@/routes/Terms"));
const Login = lazy(() => import("@/routes/Login"));
const Signup = lazy(() => import("@/routes/Signup"));
const Generate = lazy(() => import("@/routes/app/Generate"));
const Library = lazy(() => import("@/routes/app/Library"));
const Export = lazy(() => import("@/routes/app/Export"));
const Billing = lazy(() => import("@/routes/app/Billing"));
const Settings = lazy(() => import("@/routes/app/Settings"));

function RouteSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteSpinner />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/app" element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<Generate />} />
              <Route path="library" element={<Library />} />
              <Route path="export" element={<Export />} />
              <Route path="billing" element={<Billing />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </BrowserRouter>
  );
}
