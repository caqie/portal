
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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

  // Spreadsheet Config Endpoints
  const configPath = path.join(process.cwd(), "spreadsheet-config.json");

  app.get("/api/spreadsheet-config", (req, res) => {
    try {
      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, "utf-8");
        const parsed = JSON.parse(fileContent);
        res.json(parsed);
        return;
      }
    } catch (e) {
      console.error("Error reading spreadsheet config file:", e);
    }
    
    // Fallback to default values
    res.json({
      spreadsheetId: process.env.VITE_SPREADSHEET_ID || "1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4",
      appsScriptUrl: process.env.VITE_APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycby8dTUPkAb1f8EeH3DxXjTd9IZ-yAMUWxSfci9ZBLkMf3gxH3as4GlALPtER6JM-BWD/exec",
      driveFolderId: process.env.VITE_DRIVE_FOLDER_ID || "19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O"
    });
  });

  app.post("/api/spreadsheet-config", (req, res) => {
    try {
      const { spreadsheetId, appsScriptUrl, driveFolderId } = req.body;
      const newConfig = {
        spreadsheetId: spreadsheetId || "1Bh77MMU8d6fgNTKhovLE5MkG0-3CjW9cNXRZl2GyPR4",
        appsScriptUrl: appsScriptUrl || "https://script.google.com/macros/s/AKfycby8dTUPkAb1f8EeH3DxXjTd9IZ-yAMUWxSfci9ZBLkMf3gxH3as4GlALPtER6JM-BWD/exec",
        driveFolderId: driveFolderId || "19OkO6ZAMnTXaxy-58ntHRVNI85W-u23O"
      };
      fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), "utf-8");
      res.json({ success: true, config: newConfig });
    } catch (e: any) {
      console.error("Error saving spreadsheet config file:", e);
      res.status(500).json({ success: false, error: e.message || String(e) });
    }
  });

  // Generic Proxy Route to bypass CORS and client-side "Failed to fetch"
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      res.status(400).json({ error: "Missing 'url' query parameter" });
      return;
    }

    try {
      const method = req.method;
      const headers: Record<string, string> = {};

      if (req.headers["content-type"]) {
        headers["content-type"] = req.headers["content-type"] as string;
      }

      const options: any = {
        method,
        headers,
        redirect: "follow"
      };

      if (method !== "GET" && method !== "HEAD") {
        if (typeof req.body === "object" && Object.keys(req.body).length > 0) {
          options.body = JSON.stringify(req.body);
          if (!headers["content-type"]) {
            headers["content-type"] = "application/json";
          }
        } else if (req.body) {
          options.body = req.body;
        }
      }

      const response = await fetch(targetUrl, options);
      const responseContentType = response.headers.get("content-type") || "text/plain";
      res.setHeader("Content-Type", responseContentType);

      if (responseContentType.includes("json")) {
        const json = await response.json();
        res.json(json);
      } else {
        const text = await response.text();
        res.send(text);
      }
    } catch (error: any) {
      console.error("Proxy error for URL:", targetUrl, error);
      res.status(500).json({ 
        error: "Failed to fetch via proxy", 
        details: error?.message || String(error) 
      });
    }
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
