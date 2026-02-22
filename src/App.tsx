import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthGuard } from "@/components/AuthGuard";
import Landing from "@/routes/Landing";
import Pricing from "@/routes/Pricing";
import Privacy from "@/routes/Privacy";
import Terms from "@/routes/Terms";
import Login from "@/routes/Login";
import Signup from "@/routes/Signup";
import AppLayout from "@/routes/app/AppLayout";
import Generate from "@/routes/app/Generate";
import Library from "@/routes/app/Library";
import Export from "@/routes/app/Export";
import Billing from "@/routes/app/Billing";
import Settings from "@/routes/app/Settings";

export function App() {
  return (
    <BrowserRouter>
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
      <Toaster />
    </BrowserRouter>
  );
}
