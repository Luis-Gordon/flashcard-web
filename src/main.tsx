import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { App } from "@/App";
import { useAuthStore } from "@/stores/auth";
import { setOnUnauthorized } from "@/lib/api";
import "@/index.css";

// Initialize auth before rendering — subscribes to Supabase session changes
useAuthStore.getState().initialize();

// Clear session and redirect on 401 — AuthGuard handles the redirect
setOnUnauthorized(() => {
  toast.error("Session expired", {
    description: "Please sign in again.",
  });
  useAuthStore.getState().signOut();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
