#!/usr/bin/env node
/**
 * Smoke test Forecast Wars local stack (website + optional Hermes/daemon).
 */
const SITE = process.env.FW_URL ?? "http://localhost:3001";
const HERMES = process.env.HERMES_URL ?? "http://127.0.0.1:4000";
const DEBATE_WEBHOOK = process.env.ARKHE_DEBATE_WEBHOOK_URL ?? "http://127.0.0.1:9471";

async function check(name, url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(5000) });
    const ok = res.ok || res.status === 404;
    console.log(ok ? "✓" : "✗", name, res.status, url);
    return ok;
  } catch (err) {
    console.log("✗", name, String(err));
    return false;
  }
}

let passed = 0;
let total = 0;

async function run(name, fn) {
  total += 1;
  if (await fn()) passed += 1;
}

await run("Website home", () => check("home", SITE));
await run("Website arena", () => check("arena", `${SITE}/arena`));
await run("Website agents", () => check("agents", `${SITE}/agents`));
await run("Sitemap", () => check("sitemap", `${SITE}/sitemap.xml`));
await run("Robots", () => check("robots", `${SITE}/robots.txt`));
await run("Hermes health (optional)", () => check("hermes", `${HERMES}/health`));
await run("Debate webhook (optional)", () =>
  check("debate-webhook", DEBATE_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "ping" }),
  }),
);

const websiteOk = passed >= 4;
console.log(`\n${passed}/${total} checks passed`);
if (!websiteOk) {
  console.log("Website checks failed — is pnpm dev:forecast-wars running?");
}
if (passed < total) {
  console.log("Hermes/daemon checks are optional for website-only local dev.");
  console.log("Run pnpm start:forecast-wars for the full stack.");
}
process.exit(websiteOk ? 0 : 1);
