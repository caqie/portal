
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Store active sessions
  // Map<sessionId, Set<WebSocket>>
  const sessions = new Map<string, Set<WebSocket>>();
  // Map<WebSocket, { sessionId: string, role: string, nip: string, name: string }>
  const clients = new Map<WebSocket, { sessionId: string, role: string, nip: string, name: string }>();

  wss.on("connection", (ws) => {
    console.log("New WebSocket connection");

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        const { type, sessionId, role, nip, name, payload } = data;

        if (type === "join") {
          console.log(`Client ${name} (${role}) joined session ${sessionId}`);
          if (!sessions.has(sessionId)) {
            sessions.set(sessionId, new Set());
          }
          sessions.get(sessionId)!.add(ws);
          clients.set(ws, { sessionId, role, nip, name });
          
          // Notify others in the session
          broadcastToSession(sessionId, {
            type: "user_joined",
            role,
            nip,
            name
          }, ws);
        }

        if (type === "camera_frame") {
          // Relay camera frame to supervisors in the same session
          broadcastToSession(sessionId, {
            type: "camera_frame",
            nip,
            name,
            frame: payload
          }, ws, "supervisor");
        }

        if (type === "exam_status") {
          // Relay exam status to supervisors
          broadcastToSession(sessionId, {
            type: "exam_status",
            nip,
            name,
            status: payload
          }, ws, "supervisor");
        }

        if (type === "grading_update") {
           // Relay grading update to all supervisors (to sync UI)
           broadcastToSession(sessionId, {
             type: "grading_update",
             payload
           }, ws, "supervisor");
        }

      } catch (e) {
        console.error("Error processing message:", e);
      }
    });

    ws.on("close", () => {
      const clientInfo = clients.get(ws);
      if (clientInfo) {
        const { sessionId, role, nip, name } = clientInfo;
        console.log(`Client ${name} (${role}) left session ${sessionId}`);
        sessions.get(sessionId)?.delete(ws);
        if (sessions.get(sessionId)?.size === 0) {
          sessions.delete(sessionId);
        }
        clients.delete(ws);

        broadcastToSession(sessionId, {
          type: "user_left",
          role,
          nip,
          name
        });
      }
    });
  });

  function broadcastToSession(sessionId: string, data: any, excludeWs?: WebSocket, targetRole?: string) {
    const sessionClients = sessions.get(sessionId);
    if (sessionClients) {
      const message = JSON.stringify(data);
      sessionClients.forEach((client) => {
        if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
          if (!targetRole || clients.get(client)?.role === targetRole) {
            client.send(message);
          }
        }
      });
    }
  }

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
