import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import "./styles/tokens.css";
import "./styles.css";
import "./styles/portal.css";
import "./styles/staff.css";
import { RouterProvider } from "./lib/router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 20_000, refetchOnWindowFocus: false } },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider><App /></RouterProvider></AuthProvider></QueryClientProvider></StrictMode>,
);
