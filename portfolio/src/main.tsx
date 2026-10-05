import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./fonts.css";
import App from "./App";
import "./styles.css";
import "./refinements.css";
import "./revision.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (root.hasChildNodes()) hydrateRoot(root, app);
else createRoot(root).render(app);
