import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { createElement, StrictMode } from "react";
import { renderToString } from "react-dom/server";

// Ship the full semantic portfolio in HTML. Hydration adds exploration/3D.
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: App } = await server.ssrLoadModule("/src/App.tsx");
  const markup = renderToString(
    createElement(StrictMode, null, createElement(App)),
  );
  const filename = new URL("../dist/index.html", import.meta.url);
  const template = await readFile(filename, "utf8");
  await writeFile(
    filename,
    template.replace('<div id="root"></div>', `<div id="root">${markup}</div>`),
    "utf8",
  );
  console.log("Prerendered all portfolio chapters into semantic HTML.");
} finally {
  await server.close();
}
