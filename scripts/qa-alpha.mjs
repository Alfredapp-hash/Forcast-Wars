const url = process.env.ARKHE_WS_URL ?? "ws://127.0.0.1:9470";
const ws = new WebSocket(url);
const seen = new Set();
const replies = new Set();

const requiredEvents = [
  "voice.command.recognized",
  "mission.created",
  "agent.spawned",
  "browser.navigate",
  "approval.requested",
  "approval.granted",
  "mission.completed",
];

const requiredReplies = [
  "health",
  "runtime_snapshot",
  "expert_list",
  "expert_updated",
  "runtime_settings",
  "supabase_status",
  "vault_search",
];

const timeout = setTimeout(() => {
  console.error("QA timed out", {
    missingEvents: requiredEvents.filter((e) => !seen.has(e)),
    missingReplies: requiredReplies.filter((e) => !replies.has(e)),
  });
  ws.close();
  process.exit(1);
}, 30000);

ws.addEventListener("open", () => {
  send({ type: "subscribe", topics: ["arkhe.events.*"] });
  send({ type: "health" });
  send({ type: "runtime_snapshot" });
  send({ type: "expert_list" });
  send({ type: "expert_wake", payload: { role: "Research Agent" } });
  send({
    type: "runtime_settings_update",
    payload: { defaultBudgetUsd: 5, maxMissionBudgetUsd: 25, paidCloudEnabled: false },
  });
  send({ type: "supabase_status" });
  send({ type: "vault_search", payload: { query: "audit" } });
  send({
    type: "command",
    payload: { source: "api", utterance: "Director, audit my website at arkhe.com" },
  });
});

ws.addEventListener("message", (event) => {
  const msg = JSON.parse(event.data.toString());
  if (requiredReplies.includes(msg.type)) replies.add(msg.type);
  if (msg.type === "event") seen.add(msg.message.event.eventType);

  if (
    requiredEvents.every((eventType) => seen.has(eventType)) &&
    requiredReplies.every((replyType) => replies.has(replyType))
  ) {
    clearTimeout(timeout);
    console.log("Private alpha QA passed", {
      events: requiredEvents,
      replies: requiredReplies,
    });
    ws.close();
    process.exit(0);
  }
});

ws.addEventListener("error", (error) => {
  clearTimeout(timeout);
  console.error("QA failed to connect:", error.message ?? error);
  process.exit(1);
});

function send(payload) {
  ws.send(JSON.stringify(payload));
}
