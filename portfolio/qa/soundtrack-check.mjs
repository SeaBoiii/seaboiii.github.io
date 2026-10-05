import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

// The real header control is tested on either a dev server or a production build.
// Vite pages additionally support an isolated component-unmount check.
const baseUrl = process.argv[2] ?? "http://127.0.0.1:4175";
const bytes = await readFile(
  new URL("../assets/audio/quiet-mechanisms.mp3", import.meta.url),
);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let mediaRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("quiet-mechanisms.mp3")) mediaRequests += 1;
  });
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  const decoded = await page.evaluate(async (base64) => {
    const context = new AudioContext();
    const buffer = Uint8Array.from(atob(base64), (character) =>
      character.charCodeAt(0),
    ).buffer;
    const audio = await context.decodeAudioData(buffer);
    let peak = 0;
    let sum = 0;
    let seamJump = 0;
    for (let channel = 0; channel < audio.numberOfChannels; channel += 1) {
      const samples = audio.getChannelData(channel);
      seamJump = Math.max(seamJump, Math.abs(samples[0] - samples.at(-1)));
      for (const sample of samples) {
        peak = Math.max(peak, Math.abs(sample));
        sum += sample ** 2;
      }
    }
    const result = {
      durationSeconds: audio.duration,
      sampleRate: audio.sampleRate,
      channels: audio.numberOfChannels,
      peak,
      rms: Math.sqrt(sum / (audio.length * audio.numberOfChannels)),
      boundarySampleJump: seamJump,
    };
    await context.close();
    return result;
  }, bytes.toString("base64"));
  assert.ok(decoded.durationSeconds > 59.5 && decoded.durationSeconds < 60.5);
  assert.ok(decoded.peak > 0 && decoded.peak <= 1);
  assert.ok(bytes.length < 1_050_000);

  const isVite = await page.evaluate(() =>
    [...document.scripts].some((script) =>
      script.src.includes("/@vite/client"),
    ),
  );
  const control = page.locator(".site-header .soundtrack-toggle");
  const media = page.locator(".site-header .soundtrack audio");
  await control.waitFor();
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  assert.equal(await media.getAttribute("src"), null);
  assert.equal(mediaRequests, 0, "No soundtrack download before activation");

  await control.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".site-header .soundtrack-toggle")
        ?.getAttribute("aria-pressed") === "true",
  );
  assert.equal(await media.evaluate((audio) => audio.volume), 0.25);
  assert.equal(await media.evaluate((audio) => audio.loop), true);
  assert.ok(
    Math.abs(
      (await media.evaluate((audio) => audio.duration)) -
        decoded.durationSeconds,
    ) < 0.05,
    "The served soundtrack has the verified duration",
  );
  await media.evaluate((audio) => {
    audio.currentTime = audio.duration - 0.2;
  });
  await page.waitForFunction(
    () =>
      document.querySelector(".site-header .soundtrack audio")?.currentTime < 1,
  );
  await control.click();
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  assert.equal(await media.evaluate((audio) => audio.paused), true);

  await control.click();
  await page.waitForFunction(
    () => !document.querySelector(".site-header .soundtrack audio")?.paused,
  );
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pagehide")),
  );
  assert.equal(await media.evaluate((audio) => audio.paused), true);
  await page.evaluate(() =>
    window.dispatchEvent(new PageTransitionEvent("pageshow")),
  );
  assert.equal(await media.evaluate((audio) => audio.paused), true);

  await control.click();
  await page.waitForFunction(
    () => !document.querySelector(".site-header .soundtrack audio")?.paused,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await media.evaluate((audio) => audio.paused), true);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.equal(await media.evaluate((audio) => audio.paused), true);

  // A blocked download followed by a second click must remain stopped even when
  // the original request eventually completes.
  await media.evaluate((audio) => {
    audio.removeAttribute("src");
    audio.load();
  });
  let releaseRequest;
  let acknowledgeRequest;
  const interceptedRequest = new Promise((resolve) => {
    acknowledgeRequest = resolve;
  });
  await page.route("**/quiet-mechanisms.mp3", async (route) => {
    await new Promise((resolve) => {
      releaseRequest = resolve;
      acknowledgeRequest();
    });
    await route
      .fulfill({ body: bytes, contentType: "audio/mpeg" })
      .catch(() => {});
  });
  await control.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".site-header .soundtrack-toggle")
        ?.getAttribute("data-loading") === "true",
  );
  await interceptedRequest;
  await control.click();
  releaseRequest?.();
  await page.unroute("**/quiet-mechanisms.mp3");
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  assert.equal(await media.evaluate((audio) => audio.paused), true);
  assert.equal(await media.getAttribute("src"), null);

  await page.route("**/quiet-mechanisms.mp3", (route) => route.abort());
  await control.click();
  await page.locator(".site-header .soundtrack-error").waitFor();
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  await page.unroute("**/quiet-mechanisms.mp3");
  await control.click();
  await page.waitForFunction(
    () =>
      document
        .querySelector(".site-header .soundtrack-toggle")
        ?.getAttribute("aria-pressed") === "true",
  );

  await control.click();
  const requestsBeforeReload = mediaRequests;
  await page.reload({ waitUntil: "networkidle" });
  await control.waitFor();
  assert.equal(await control.getAttribute("aria-pressed"), "false");
  assert.equal(await media.getAttribute("src"), null);
  assert.equal(
    mediaRequests,
    requestsBeforeReload,
    "A new visit stays silent and makes no audio request",
  );

  const checks = [
    "real header control",
    "no initial request",
    "user activation",
    "served audio duration",
    "volume 0.25",
    "actual loop wrap",
    "toggle off",
    "pagehide pause",
    "simulated visibility pause",
    "explicit resume only",
    "cancel pending play",
    "network failure",
    "retry",
    "default off after reload",
  ];
  if (isVite) {
    await page.evaluate(async () => {
      const [
        { default: Soundtrack },
        { default: React },
        { default: ReactDOM },
      ] = await Promise.all([
        import("/src/Soundtrack.tsx"),
        import("/node_modules/.vite/deps/react.js"),
        import("/node_modules/.vite/deps/react-dom_client.js"),
      ]);
      const host = document.createElement("div");
      host.id = "soundtrack-test";
      host.style.cssText =
        "position:fixed;left:20px;bottom:20px;z-index:9999;background:white";
      document.body.append(host);
      window.soundtrackTestRoot = ReactDOM.createRoot(host);
      window.soundtrackTestRoot.render(React.createElement(Soundtrack));
    });
    await page.locator("#soundtrack-test button").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("#soundtrack-test button")
          ?.getAttribute("aria-pressed") === "true",
    );
    const unmounted = await page.evaluate(() => {
      const audio = document.querySelector("#soundtrack-test audio");
      window.soundtrackTestRoot.unmount();
      return { paused: audio.paused, source: audio.getAttribute("src") };
    });
    assert.equal(unmounted.paused, true);
    assert.equal(unmounted.source, null);
    checks.push("isolated unmount pause (Vite only)");
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        target: baseUrl,
        mode: isVite ? "development" : "production",
        bytes: bytes.length,
        decoded,
        checks,
        limitation:
          "Objective decode and playback checks only; no subjective audition. Visibility is simulated.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
