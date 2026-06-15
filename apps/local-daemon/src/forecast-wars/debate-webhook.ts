import http from "node:http";
import type { DebateRunner } from "../forecast-wars/debate-runner.js";
import type { DebateOrchestrator } from "../forecast-wars/debate-orchestrator.js";

export function startDebateWebhookServer(
  port: number,
  debateRunner: DebateRunner,
  debateOrchestrator: DebateOrchestrator,
): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method !== "POST") {
      res.writeHead(405);
      res.end();
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      void (async () => {
        try {
          const payload = JSON.parse(body) as Record<string, unknown>;
          const action = payload.action as string;

          if (action === "ping") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
            return;
          }

          if (action === "run_debate" && payload.debateRoomId && payload.predictionId && payload.title) {
            void debateRunner.runFullFlow({
              debateRoomId: payload.debateRoomId as string,
              predictionId: payload.predictionId as string,
              title: payload.title as string,
              yesPosition: (payload.yesPosition as string) ?? "",
              noPosition: (payload.noPosition as string) ?? "",
              affirmativeAgentId: (payload.affirmativeAgentId as string) ?? "agt_athena",
              negativeAgentId: (payload.negativeAgentId as string) ?? "agt_prometheus",
            });
            res.writeHead(202, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "debate_started" }));
            return;
          }

          if (action === "start_debate" && payload.predictionId && payload.title) {
            const result = await debateOrchestrator.startDebate({
              predictionId: payload.predictionId as string,
              predictionSlug: (payload.predictionSlug as string) ?? "",
              title: payload.title as string,
              description: (payload.description as string) ?? "",
              yesPosition: (payload.yesPosition as string) ?? "",
              noPosition: (payload.noPosition as string) ?? "",
            });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
            return;
          }

          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Invalid action or missing fields" }));
        } catch (err) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: String(err) }));
        }
      })();
    });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`[forecast-wars] Debate webhook listening on http://127.0.0.1:${port}`);
  });

  return server;
}
