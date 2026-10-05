import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

// Actual-browser audit: npm run qa -- http://127.0.0.1:4173 [first|second]
const baseUrl = process.argv[2] ?? "http://127.0.0.1:4173";
const pass = process.argv[3] ?? "first";
const scope = process.argv[4] ?? "full";
const outputDirectory = fileURLToPath(
  new URL(`./artifacts/${pass}/`, import.meta.url),
);
const desktop = { name: "desktop-1440", width: 1440, height: 1000 };
const viewports = [
  desktop,
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-393", width: 393, height: 873 },
  { name: "mobile-412", width: 412, height: 915 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-1024", width: 1024, height: 768 },
];
const captureIds = [
  "hero",
  "journey",
  "project-tiny-ai",
  "project-rover",
  "project-icm-buddy",
  "project-classility",
  "playground",
  "about",
  "contact",
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

async function runScenario(viewport, mode = "standard") {
  const scenarioName = `${viewport.name}-${mode}`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.width < 760,
    hasTouch: viewport.width < 760,
    reducedMotion: mode === "reduced-motion" ? "reduce" : "no-preference",
  });
  await context.addInitScript(
    ({ disableWebGL }) => {
      if (disableWebGL) {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (/^(?:webgl2?|experimental-webgl)$/i.test(type)) return null;
          return getContext.call(this, type, ...args);
        };
      }
      window.__portfolioAudit = {
        lcp: 0,
        lcpElement: "",
        cls: 0,
        clsWindow: 0,
        clsWindowStart: 0,
        clsLast: 0,
        longTasks: [],
        events: [],
        webglDraws: 0,
      };
      const metrics = window.__portfolioAudit;
      for (const Context of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!Context) continue;
        for (const method of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
          const original = Context.prototype[method];
          if (!original) continue;
          Context.prototype[method] = function (...args) {
            metrics.webglDraws += 1;
            return original.apply(this, args);
          };
        }
      }
      const observe = (type, callback, extras = {}) => {
        try {
          new PerformanceObserver((list) =>
            list.getEntries().forEach(callback),
          ).observe({ type, buffered: true, ...extras });
        } catch {
          /* Metric support is recorded by supportedEntryTypes below. */
        }
      };
      observe("largest-contentful-paint", (entry) => {
        metrics.lcp = entry.startTime;
        metrics.lcpElement = entry.element
          ? `${entry.element.tagName.toLowerCase()}${entry.element.id ? "#" + entry.element.id : ""}`
          : "";
      });
      observe("layout-shift", (entry) => {
        if (entry.hadRecentInput) return;
        if (
          entry.startTime - metrics.clsLast > 1000 ||
          entry.startTime - metrics.clsWindowStart > 5000
        ) {
          metrics.clsWindowStart = entry.startTime;
          metrics.clsWindow = 0;
        }
        metrics.clsLast = entry.startTime;
        metrics.clsWindow += entry.value;
        metrics.cls = Math.max(metrics.cls, metrics.clsWindow);
      });
      observe("longtask", (entry) =>
        metrics.longTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        }),
      );
      observe(
        "event",
        (entry) => {
          if (entry.interactionId)
            metrics.events.push({
              name: entry.name,
              duration: entry.duration,
              interactionId: entry.interactionId,
            });
        },
        { durationThreshold: 16 },
      );
    },
    { disableWebGL: mode === "webgl-unavailable" },
  );

  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText,
    }),
  );
  page.on("response", (response) => {
    if (response.status() >= 400)
      badResponses.push({ url: response.url(), status: response.status() });
  });
  const session = await context.newCDPSession(page);
  await session.send("Performance.enable");
  // This is a reproducible CPU approximation, not a physical phone/GPU benchmark.
  if (viewport.width < 760)
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  if (mode === "mobile-network") {
    await session.send("Network.enable");
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 100,
      downloadThroughput: 500000,
      uploadThroughput: 125000,
      connectionType: "cellular4g",
    });
  }
  const url = new URL(baseUrl);
  if (mode === "static") url.searchParams.set("quality", "static");
  await page.goto(url.href, { waitUntil: "networkidle", timeout: 45000 });
  await page.locator("h1").waitFor({ state: "visible" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  // Freeze initial-view loading evidence before programmatic section exploration.
  const initialLoading = await page.evaluate(() => ({
    lcp: window.__portfolioAudit.lcp,
    lcpElement: window.__portfolioAudit.lcpElement,
    cls: window.__portfolioAudit.cls,
    resourceCount: performance.getEntriesByType("resource").length,
    transferBytes: performance
      .getEntriesByType("resource")
      .reduce((sum, entry) => sum + entry.transferSize, 0),
  }));
  const failures = [];
  const checks = [];
  let computeDiagnostics = null;
  const check = (name, passed, evidence) => {
    checks.push({ name, passed, evidence });
    if (!passed) failures.push(name);
  };
  check(
    "local initial-view LCP stays below 2.5 seconds",
    initialLoading.lcp > 0 && initialLoading.lcp <= 2500,
    initialLoading,
  );
  const overflow = [];
  const screenshots = [];
  const ids =
    scope === "targeted" ? ["hero", "project-icm-buddy", "contact"] : mode === "standard" ? captureIds : ["hero", "project-tiny-ai", "contact"];
  for (const id of ids) {
    const section = page.locator(`#${id}`);
    if (!(await section.count())) {
      check(`section ${id} exists`, false);
      continue;
    }
    await section.evaluate((element) => {
      const header = document.querySelector("header");
      const inset = header?.getBoundingClientRect().height ?? 80;
      window.scrollTo({
        top: element.getBoundingClientRect().top + window.scrollY - inset - 16,
        behavior: "instant",
      });
    });
    await page.waitForTimeout(180);
    const width = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    if (Math.max(width.document, width.body) > width.viewport + 1)
      overflow.push({ section: id, ...width });
    const filename = `${scenarioName}-${id}.png`;
    await page.screenshot({
      path: path.join(outputDirectory, filename),
      animations: "disabled",
    });
    screenshots.push(filename);
    if ((await section.boundingBox())?.height > viewport.height) {
      const fullSection = `${scenarioName}-${id}-section.png`;
      await section.screenshot({
        path: path.join(outputDirectory, fullSection),
        animations: "disabled",
      });
      screenshots.push(fullSection);
    }
  }
  check(
    "no horizontal overflow across captured chapters",
    overflow.length === 0,
    overflow,
  );
  check(
    "single identity heading",
    (await page.locator("h1").count()) === 1,
    await page.locator("h1").allTextContents(),
  );
  check(
    "semantic primary navigation",
    (await page.getByRole("navigation").count()) > 0,
  );
  check(
    "all four selected work chapters present",
    (await page.locator('[id^="project-"]').count()) >= 4,
  );
  check(
    "email contact link",
    (await page.locator('a[href^="mailto:"]').count()) > 0,
  );
  const navigationTargets = await page
    .locator(".nav-links a")
    .evaluateAll((links) =>
      links.map((link) => {
        const rect = link.getBoundingClientRect();
        return {
          text: link.textContent?.trim(),
          width: rect.width,
          height: rect.height,
          targetExists:
            link.hash.length > 1 &&
            !!document.getElementById(link.hash.slice(1)),
        };
      }),
    );
  check(
    "navigation links resolve to real chapters",
    navigationTargets.length >= 4 &&
      navigationTargets.every((link) => link.targetExists),
    navigationTargets,
  );
  if (viewport.width < 760)
    check(
      "mobile navigation touch targets reach 44px",
      navigationTargets.every((link) => link.height >= 44),
      navigationTargets,
    );

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.keyboard.press("Tab");
  const firstFocus = await page.evaluate(() => {
    const element = document.activeElement;
    const styles = element ? getComputedStyle(element) : null;
    return {
      tag: element?.tagName,
      text: element?.textContent?.trim(),
      href: element?.getAttribute("href"),
      outline: styles?.outlineStyle,
      outlineWidth: styles?.outlineWidth,
    };
  });
  check(
    "keyboard starts with skip link",
    /skip/i.test(firstFocus.text ?? "") && firstFocus.href?.startsWith("#"),
    firstFocus,
  );
  check(
    "visible keyboard focus",
    firstFocus.outline !== "none" &&
      parseFloat(firstFocus.outlineWidth ?? "0") > 0,
    firstFocus,
  );
  if (firstFocus.href?.startsWith("#")) {
    await page.keyboard.press("Enter");
    const destination = firstFocus.href.slice(1);
    const reached = await page.evaluate((id) => {
      const element = document.getElementById(id);
      return {
        exists: !!element,
        activeId: document.activeElement?.id,
        top: element?.getBoundingClientRect().top,
        viewportHeight: innerHeight,
      };
    }, destination);
    check(
      "skip link reaches main content",
      reached.exists &&
        (reached.activeId === destination ||
          (reached.top >= -1 && reached.top < reached.viewportHeight)),
      reached,
    );
  }

  const filterButtons = page.locator(".filter-button");
  if (await filterButtons.count()) {
    const initialCards = await page.locator(".play-card").count();
    let filtersUsable = true;
    const evidence = [];
    for (const button of await filterButtons.all()) {
      await button.focus();
      await page.keyboard.press("Enter");
      const label = (await button.textContent())?.trim();
      const count = await page.locator(".play-card").count();
      const pressed = await button.getAttribute("aria-pressed");
      evidence.push({ label, count, pressed });
      if (pressed !== "true" || count < 1) filtersUsable = false;
    }
    await filterButtons.first().click();
    check(
      "playground filters work by keyboard and restore All",
      filtersUsable &&
        (await page.locator(".play-card").count()) === initialCards,
      evidence,
    );
  } else check("playground category filters present", false);

  const details = page.locator("details");
  if (await details.count()) {
    const first = details.first();
    const summary = first.locator("summary");
    await summary.focus();
    await page.keyboard.press("Enter");
    check(
      "case-study details open by keyboard",
      (await first.getAttribute("open")) !== null,
    );
    await page.keyboard.press("Enter");
    check(
      "case-study details close by keyboard",
      (await first.getAttribute("open")) === null,
    );
  }
  const icmMedia = page.getByRole("group", { name: "ICM Buddy visual" });
  if (await icmMedia.count()) {
    const diagram = icmMedia.getByRole("button", {
      name: "Diagram",
      exact: true,
    });
    await diagram.focus();
    await page.keyboard.press("Enter");
    check(
      "ICM diagram opens by keyboard",
      (await diagram.getAttribute("aria-pressed")) === "true" &&
        (await page.locator("#project-icm-buddy .icm-figure").isVisible()),
    );
    const diagramCapture = `${scenarioName}-icm-diagram.png`;
    await page
      .locator("#project-icm-buddy .project-visual")
      .screenshot({
        path: path.join(outputDirectory, diagramCapture),
        animations: "disabled",
      });
    screenshots.push(diagramCapture);
    const prototype = icmMedia.getByRole("button", {
      name: "Prototype",
      exact: true,
    });
    await prototype.focus();
    await page.keyboard.press("Enter");
    check(
      "ICM prototype photo restores by keyboard",
      (await prototype.getAttribute("aria-pressed")) === "true" &&
        (await page.locator("#project-icm-buddy .icm-photo img").isVisible()),
    );
  }
  const toggle = page.locator("#core-toggle");
  if ((await toggle.count()) && (await toggle.isVisible())) {
    await toggle.focus();
    const before = await toggle.getAttribute("aria-expanded");
    await page.keyboard.press("Enter");
    const after = await toggle.getAttribute("aria-expanded");
    check(
      "core detail control works by keyboard",
      before !== after && ["true", "false"].includes(after),
      { before, after },
    );
    // Focusing a distant control can start native smooth scrolling. Measure
    // demand-render rest after that browser movement has actually stopped.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          let previous = scrollY,
            stable = 0;
          const started = performance.now();
          const sample = () => {
            stable = Math.abs(scrollY - previous) < 0.5 ? stable + 1 : 0;
            previous = scrollY;
            if (stable >= 8 || performance.now() - started > 2500) resolve();
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }),
    );
    await page.waitForTimeout(600);
    computeDiagnostics = await page.evaluate(() =>
      window.__computeDiagnostics ? { ...window.__computeDiagnostics } : null,
    );
    if (computeDiagnostics) {
      check(
        "WebGL DPR is bounded",
        computeDiagnostics.dpr <= 1.5,
        computeDiagnostics,
      );
      check(
        "WebGL comes to rest after interaction",
        computeDiagnostics.rendering === "resting",
        computeDiagnostics,
      );
      const drawsBeforeRest = await page.evaluate(() => window.__portfolioAudit.webglDraws);
      await page.waitForTimeout(350);
      const drawsAfterRest = await page.evaluate(() => window.__portfolioAudit.webglDraws);
      check("resting scene does not keep drawing", drawsBeforeRest === drawsAfterRest, { drawsBeforeRest, drawsAfterRest });
    }
    await page.keyboard.press("Enter");
  }
  if (mode === "static" || mode === "webgl-unavailable") {
    check(
      "static fallback retains complete content",
      (await page.locator("h1").isVisible()) ||
        (await page.locator("h1").count()) === 1,
    );
    check(
      "static fallback has no active WebGL canvas",
      (await page.locator(".core-stage canvas").count()) === 0,
    );
  }
  if (mode === "reduced-motion") {
    const reduced = await page.evaluate(() => ({
      media: matchMedia("(prefers-reduced-motion: reduce)").matches,
      smooth: getComputedStyle(document.documentElement).scrollBehavior,
      animations: document
        .getAnimations()
        .filter((animation) => animation.playState === "running").length,
    }));
    check(
      "reduced motion uses native immediate scroll",
      reduced.media && reduced.smooth !== "smooth",
      reduced,
    );
  }

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const axeViolations = axe.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  }));
  check(
    "axe WCAG 2.1 AA automated checks",
    axeViolations.length === 0,
    axeViolations,
  );

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const durations = [];
        let previous = 0;
        const start = performance.now();
        const sample = (timestamp) => {
          if (previous) durations.push(timestamp - previous);
          previous = timestamp;
          if (timestamp - start < 1000) requestAnimationFrame(sample);
          else {
            durations.sort((a, b) => a - b);
            resolve({
              sampleCount: durations.length,
              medianMs: durations[Math.floor(durations.length * 0.5)],
              p95Ms: durations[Math.floor(durations.length * 0.95)],
              maxMs: Math.max(...durations),
            });
          }
        };
        requestAnimationFrame(sample);
      }),
  );
  const drawsBeforeScroll = await page.evaluate(() => window.__portfolioAudit.webglDraws);
  const scrollFrames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const durations = [];
        const start = performance.now();
        const travel = Math.min(
          document.documentElement.scrollHeight - innerHeight,
          innerHeight * 3,
        );
        let previous = 0;
        const sample = (timestamp) => {
          if (previous) durations.push(timestamp - previous);
          previous = timestamp;
          const progress = Math.min(1, (timestamp - start) / 1000);
          window.scrollTo({ top: travel * progress, behavior: "instant" });
          if (progress < 1) requestAnimationFrame(sample);
          else {
            durations.sort((a, b) => a - b);
            resolve({
              sampleCount: durations.length,
              medianMs: durations[Math.floor(durations.length * 0.5)],
              p95Ms: durations[Math.floor(durations.length * 0.95)],
              maxMs: Math.max(...durations),
            });
          }
        };
        requestAnimationFrame(sample);
      }),
  );
  const drawsAfterScroll = await page.evaluate(() => window.__portfolioAudit.webglDraws);
  const drawsDuringScroll = drawsAfterScroll - drawsBeforeScroll;
  if (mode === "reduced-motion") check("reduced-motion scroll does not redraw an unchanged core", drawsDuringScroll === 0, { drawsBeforeScroll, drawsAfterScroll });
  if (scope === "targeted") {
    await page.locator("#playground").evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + 700, behavior: "instant" }));
    await page.waitForTimeout(500);
    const offscreen = await page.locator(".core-stage").getAttribute("data-visible");
    const drawsBeforeOffscreen = await page.evaluate(() => window.__portfolioAudit.webglDraws);
    await page.waitForTimeout(350);
    const drawsAfterOffscreen = await page.evaluate(() => window.__portfolioAudit.webglDraws);
    check("offscreen core pauses rendering", offscreen === "false" && drawsBeforeOffscreen === drawsAfterOffscreen, { offscreen, drawsBeforeOffscreen, drawsAfterOffscreen });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.waitForTimeout(600);
    check("core returns when hero is visible", await page.locator(".core-stage").getAttribute("data-visible") === "true");
  }
  const vitals = await page.evaluate(() => {
    const metrics = window.__portfolioAudit;
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      initiatorType: entry.initiatorType,
      startMs: entry.startTime,
      durationMs: entry.duration,
      transferBytes: entry.transferSize,
      decodedBytes: entry.decodedBodySize,
    }));
    return {
      ...metrics,
      supported: PerformanceObserver.supportedEntryTypes,
      observedInteractionMaximumMs: Math.max(
        0,
        ...metrics.events.map((event) => event.duration),
      ),
      navigation: navigation
        ? {
            domContentLoadedMs: navigation.domContentLoadedEventEnd,
            loadMs: navigation.loadEventEnd,
          }
        : null,
      resources,
      totalTransferBytes: resources.reduce(
        (sum, resource) => sum + resource.transferBytes,
        0,
      ),
      scene: {
        quality: document
          .querySelector(".core-stage")
          ?.getAttribute("data-quality"),
        canvases: document.querySelectorAll("canvas").length,
      },
    };
  });
  const cdpMetrics = await session.send("Performance.getMetrics");
  check("no browser console errors", consoleErrors.length === 0, consoleErrors);
  check(
    "no failed network requests",
    failedRequests.length === 0,
    failedRequests,
  );
  check("no HTTP error responses", badResponses.length === 0, badResponses);
  check("layout shift stays below 0.1", vitals.cls <= 0.1, vitals.cls);
  if (vitals.events.length)
    check(
      "observed interactions stay below 200ms",
      vitals.observedInteractionMaximumMs <= 200,
      vitals.observedInteractionMaximumMs,
    );
  const result = {
    name: scenarioName,
    viewport,
    mode,
    passed: failures.length === 0,
    checks,
    failures,
    screenshots,
    axeViolations,
    consoleErrors,
    failedRequests,
    badResponses,
    performance: {
      ...vitals,
      lcp: initialLoading.lcp,
      lcpElement: initialLoading.lcpElement,
      initialLoading,
      computeDiagnostics,
      frames,
      scrollFrames,
      drawsDuringScroll,
      cdp: Object.fromEntries(
        cdpMetrics.metrics.map((metric) => [metric.name, metric.value]),
      ),
      conditions: {
        browser: "Headless Chromium",
        deviceScaleFactor: 1,
        mobileCpuThrottle: viewport.width < 760 ? 4 : 1,
        networkThrottled: mode === "mobile-network",
        network:
          mode === "mobile-network"
            ? "4 Mbps down / 1 Mbps up / 100 ms latency"
            : "Local unthrottled",
      },
      limits:
        "Local synthetic observations; sampled interaction latency is not field INP. RAF timing does not measure GPU load or physical mobile frame consistency.",
    },
  };
  await writeFile(
    path.join(outputDirectory, `${scenarioName}.json`),
    JSON.stringify(result, null, 2),
  );
  console.log(
    `${scenarioName}: ${result.passed ? "PASS" : "FAIL"}; LCP ${Math.round(initialLoading.lcp)} ms; CLS ${vitals.cls.toFixed(4)}; ${failures.join(", ")}`,
  );
  results.push(result);
  await context.close();
}

async function runWithoutJavaScript(viewport) {
  const name = `${viewport.name}-javascript-disabled`;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    javaScriptEnabled: false,
    deviceScaleFactor: 1,
    isMobile: viewport.width < 760,
    hasTouch: viewport.width < 760,
  });
  const page = await context.newPage();
  const badResponses = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      badResponses.push({ url: response.url(), status: response.status() });
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const checks = [];
  const check = (label, passed, evidence) =>
    checks.push({ name: label, passed, evidence });
  check(
    "identity renders without JavaScript",
    (await page.locator("h1").count()) === 1 &&
      (await page.locator("h1").first().isVisible()),
    await page.locator("h1").allTextContents(),
  );
  for (const id of [
    "journey",
    "project-tiny-ai",
    "project-rover",
    "project-icm-buddy",
    "project-classility",
    "playground",
    "about",
    "contact",
  ]) {
    check(
      `${id} has server-rendered content`,
      (await page.locator(`#${id}`).count()) === 1 &&
        (await page.locator(`#${id}`).textContent())?.trim().length > 20,
    );
  }
  check(
    "one biography without duplicated noscript fallback",
    (await page.locator("#about").count()) === 1 &&
      (await page.locator("main").count()) === 1,
  );
  check(
    "contact and work links remain usable",
    (await page.locator('a[href^="mailto:"]').count()) > 0 &&
      (await page
        .locator('a[href*="github.com/SeaBoiii/amd_trainatinyai"]')
        .count()) > 0,
  );
  const width = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  check(
    "no horizontal overflow without JavaScript",
    width.document <= width.viewport + 1,
    width,
  );
  check(
    "no active WebGL canvas without JavaScript",
    (await page.locator("canvas").count()) === 0,
  );
  check(
    "no HTTP errors without JavaScript",
    badResponses.length === 0,
    badResponses,
  );
  const screenshots = [];
  for (const id of ["hero", "project-icm-buddy", "contact"]) {
    const section = page.locator(`#${id}`);
    if (!(await section.count())) continue;
    await section.scrollIntoViewIfNeeded();
    const filename = `${name}-${id}.png`;
    await page.screenshot({ path: path.join(outputDirectory, filename) });
    screenshots.push(filename);
  }
  const failures = checks
    .filter((check) => !check.passed)
    .map((check) => check.name);
  const result = {
    name,
    viewport,
    mode: "javascript-disabled",
    passed: failures.length === 0,
    checks,
    failures,
    screenshots,
    badResponses,
    performance: {
      limits:
        "Server-rendered usability check; no in-page timing observers run with JavaScript disabled.",
    },
  };
  await writeFile(
    path.join(outputDirectory, `${name}.json`),
    JSON.stringify(result, null, 2),
  );
  console.log(
    `${name}: ${result.passed ? "PASS" : "FAIL"}; ${failures.join(", ")}`,
  );
  results.push(result);
  await context.close();
}

try {
  if (scope === "targeted") {
    for (const mode of ["standard", "reduced-motion"]) {
      await runScenario(desktop, mode);
      await runScenario(viewports[2], mode);
    }
  } else {
    for (const viewport of viewports) await runScenario(viewport);
    for (const mode of ["reduced-motion", "static", "webgl-unavailable"]) {
      await runScenario(desktop, mode);
      await runScenario(viewports[2], mode);
    }
    await runScenario(viewports[3], "mobile-network");
    await runWithoutJavaScript(desktop);
    await runWithoutJavaScript(viewports[2]);
  }
} finally {
  await browser.close();
  const summary = {
    baseUrl,
    pass,
    scope,
    capturedAt: new Date().toISOString(),
    scenarios: results.map(({ name, passed, failures, performance }) => ({
      name,
      passed,
      failures,
      lcpMs: performance.lcp,
      cls: performance.cls,
      observedInteractionMaximumMs: performance.observedInteractionMaximumMs,
      transferBytes: performance.totalTransferBytes,
      frames: performance.frames,
      scrollFrames: performance.scrollFrames,
    })),
  };
  await writeFile(
    path.join(outputDirectory, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  if (results.some((result) => !result.passed)) process.exitCode = 1;
  console.log(`Audit artifacts: ${outputDirectory}`);
}
