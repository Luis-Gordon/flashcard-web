import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/App";
import { useAuthStore } from "@/stores/auth";
import "@/index.css";

// Initialize auth before rendering — subscribes to Supabase session changes
useAuthStore.getState().initialize();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
