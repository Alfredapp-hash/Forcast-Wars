#!/usr/bin/env node
/**
 * Hermes smoke test
 * Usage: node scripts/smoke-hermes.mjs
 * Env:   HERMES_URL=http://127.0.0.1:4000  (default)
 *
 * Checks:
 *  1. GET /health          → { status: "ok" }
 *  2. GET /capabilities    → array (may be empty)
 *  3. POST /gateway/ingest → { messageId, decision }
 *  4. WS /ws ping          → pong frame
 *  5. POST approval envelope → decision.type === "await_approval"
 */

const BASE = (process.env.HERMES_URL ?? "http://127.0.0.1:4000").replace(/\/$/, "");
const WS_URL = BASE.replace(/^http/, "ws") + "/ws";
const TIMEOUT_MS = 10_000;

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return res.json();
}

// ── 1. Health ─────────────────────────────────────────────────────────────────
try {
  const health = await get("/health");
  const status = health?.status ?? health?.info?.["nestjs-terminus"]?.status;
  if (status === "ok" || status === "up") {
    ok("GET /health → ok");
  } else {
    fail("GET /health", `unexpected status: ${JSON.stringify(health)}`);
  }
} catch (err) {
  fail("GET /health", err.message);
}

// ── 2. Capabilities list ──────────────────────────────────────────────────────
try {
  const caps = await get("/capabilities");
  if (Array.isArray(caps)) {
    ok(`GET /capabilities → array (${caps.length} registered)`);
  } else {
    fail("GET /capabilities", `not an array: ${JSON.stringify(caps)}`);
  }
} catch (err) {
  fail("GET /capabilities", err.message);
}

// ── 3. Ingest — agent dispatch ────────────────────────────────────────────────
try {
  const result = await post("/gateway/ingest", {
    source: "smoke-test",
    role: "user",
    payload: { message: "hello from smoke test", agentRole: "general" },
  });
  if (result?.messageId && result?.decision?.type) {
    ok(`POST /gateway/ingest → ${result.decision.type} (msg: ${result.messageId.slice(0, 8)}…)`);
  } else {
    fail("POST /gateway/ingest", `unexpected shape: ${JSON.stringify(result)}`);
  }
} catch (err) {
  fail("POST /gateway/ingest", err.message);
}

// ── 4. Ingest — approval routing ──────────────────────────────────────────────
try {
  const approvalId = `smoke-${Date.now()}`;
  const result = await post("/gateway/ingest", {
    source: "smoke-test",
    role: "system",
    routingHint: "approval",
    payload: {
      approvalId,
      riskClass: "yellow",
      action: "smoke.test.action",
      summary: "Smoke test approval — safe to ignore",
      requestedByAgentId: "agt_smoke_01",
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    },
  });
  if (result?.decision?.type === "await_approval") {
    ok(`POST /gateway/ingest (approval) → await_approval (id: ${approvalId.slice(0, 16)}…)`);
  } else {
    fail("POST /gateway/ingest (approval)", `expected await_approval, got: ${result?.decision?.type}`);
  }
} catch (err) {
  fail("POST /gateway/ingest (approval)", err.message);
}

// ── 5. WebSocket ping/pong ────────────────────────────────────────────────────
await new Promise((resolve) => {
  const timer = setTimeout(() => {
    fail("WS /ws ping→pong", "timeout");
    resolve();
  }, TIMEOUT_MS);

  try {
    const ws = new WebSocket(WS_URL);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ event: "ping", data: {} }));
    });

    ws.addEventListener("message", (evt) => {
      try {
        const msg = JSON.parse(evt.data.toString());
        const event = msg.event ?? msg.type ?? "";
        if (event === "pong" || event === "connected") {
          clearTimeout(timer);
          ok(`WS /ws → "${event}" received`);
          ws.close();
          resolve();
        }
      } catch {
        /* ignore non-JSON */
      }
    });

    ws.addEventListener("error", (err) => {
      clearTimeout(timer);
      fail("WS /ws ping→pong", err.message ?? String(err));
      resolve();
    });
  } catch (err) {
    clearTimeout(timer);
    fail("WS /ws ping→pong", err.message);
    resolve();
  }
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log("");
console.log(`Hermes smoke: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
