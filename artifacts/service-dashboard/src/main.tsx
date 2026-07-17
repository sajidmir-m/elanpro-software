import { createRoot } from "react-dom/client";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { configureApiClient } from "./lib/api-config";
import { isDesktopApp } from "./lib/runtime";
import { supabase } from "./lib/supabase";
import "./index.css";

configureApiClient(setBaseUrl);

if (isDesktopApp) {
  document.documentElement.classList.add("desktop-app");
}

setAuthTokenGetter(async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
});

createRoot(document.getElementById("root")!).render(<App />);
