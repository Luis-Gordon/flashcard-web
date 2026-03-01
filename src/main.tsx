import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toast } from "sonner";
import { App } from "@/App";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";
import { setOnUnauthorized } from "@/lib/api";
import "@/index.css";

// ---------------------------------------------------------------------------
// Theme — apply before first render to prevent flash of wrong theme
// ---------------------------------------------------------------------------

export function applyTheme() {
  const { themeMode } = useSettingsStore.getState();
  const prefersDark =
    themeMode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : themeMode === "dark";

  document.documentElement.classList.toggle("dark", prefersDark);
}

applyTheme();

// Re-apply when the user changes theme preference in Settings
useSettingsStore.subscribe((s) => s.themeMode, applyTheme);

// Re-apply when OS preference changes (only matters in "system" mode)
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", applyTheme);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// Initialize auth before rendering — subscribes to Supabase session changes
useAuthStore.getState().initialize();

// Clear session and redirect on 401 — AuthGuard handles the redirect
setOnUnauthorized(() => {
  toast.error("Session expired", {
    description: "Please sign in again.",
  });
  useAuthStore.getState().signOut();
});

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
