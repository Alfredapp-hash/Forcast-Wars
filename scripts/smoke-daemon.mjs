const url = process.env.ARKHE_WS_URL ?? "ws://127.0.0.1:9470";
const ws = new WebSocket(url);
const seen = new Set();
const required = [
  "voice.command.recognized",
  "model.route.requested",
  "model.route.selected",
  "mission.created",
  "mission.planned",
  "agent.spawned",
  "agent.started",
  "agent.message",
  "mission.started",
  "browser.navigate",
  "model.route.completed",
  "approval.requested",
  "approval.granted",
  "mission.completed",
];

const timeout = setTimeout(() => {
  console.error("Smoke test timed out. Seen:", Array.from(seen));
  ws.close();
  process.exit(1);
}, 15000);

ws.addEventListener("open", () => {
  ws.send(JSON.stringify({ type: "subscribe", topics: ["arkhe.events.*"] }));
  ws.send(JSON.stringify({ type: "health" }));
  ws.send(JSON.stringify({
    type: "command",
    payload: { source: "api", utterance: "Director, audit my website at arkhe.com" },
  }));
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data.toString());
  if (msg.type === "health") {
    if (msg.status.status !== "ok") {
      console.error("Daemon health degraded", msg.status);
      clearTimeout(timeout);
      process.exit(1);
    }
  }
  if (msg.type === "event") {
    seen.add(msg.message.event.eventType);
    if (required.every((eventType) => seen.has(eventType))) {
      clearTimeout(timeout);
      console.log("Smoke test passed:", required.join(", "));
      ws.close();
      process.exit(0);
    }
  }
});

ws.addEventListener("error", (error) => {
  clearTimeout(timeout);
  console.error("Smoke test failed to connect:", error.message ?? error);
  process.exit(1);
});
