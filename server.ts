import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const BASE_URL = "https://myportagent-jun-1008791897094.us-east1.run.app";
const PORT = 3000;

async function startServer() {
  const app = express();
  
  app.use(express.json());

  // Log intermediate incoming API routes to ease debugging
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[Incoming Request] ${req.method} ${req.path}`);
    }
    next();
  });

  // Proxy endpoint for getting metrics from analytics agent
  app.get("/api/analytics/metrics", async (req, res) => {
    try {
      const targetBaseUrl = (req.query.baseUrl as string) || "https://myanalyticsagent-jun-1008791897094.us-east1.run.app";
      const appName = (req.query.appName as string) || "app";
      const url = `${targetBaseUrl}/apps/${appName}/metrics-info`;
      console.log(`[Proxy] GETting metrics from: ${url}`);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({
          error: "UpstreamError",
          status: response.status,
          details: text
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy Error] Analytics metrics failed:", error);
      res.status(502).json({
        error: "Failed to connect to analytics service",
        details: error.message
      });
    }
  });

  // Proxy endpoint for getting session ID
  app.post("/api/sessions", async (req, res) => {
    try {
      // Allow dynamic custom agent target urls and configuration to be passed from client
      const targetBaseUrl = req.body.baseUrl || BASE_URL;
      const targetAppName = req.body.appName || "app";
      const targetUserId = req.body.userId || "web-user-01";

      const url = `${targetBaseUrl}/apps/${targetAppName}/users/${targetUserId}/sessions`;
      console.log(`[Proxy] GETting session ID from: ${url}`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Upstream returned response code ${response.status}`);
      }

      const data = await response.json();
      console.log("[Proxy] Session response data received:", data);
      res.json(data);
    } catch (error: any) {
      console.error("[Proxy Error] Sessions endpoint failed:", error);
      res.status(502).json({ 
        error: "Failed to connect to upstream port agent API", 
        details: error.message 
      });
    }
  });

  // Proxy endpoint for running message evaluation
  app.post("/api/run", async (req, res) => {
    try {
      const targetBaseUrl = req.body.baseUrl || BASE_URL;
      const url = `${targetBaseUrl}/run`;
      console.log(`[Proxy] Posting payload to: ${url}`);

      // Forward only the valid payload keys the upstream agent expects
      const upstreamPayload = {
        app_name: req.body.appName || req.body.app_name || "app",
        user_id: req.body.userId || req.body.user_id || "web-user-01",
        session_id: req.body.sessionId || req.body.session_id,
        new_message: req.body.newMessage || req.body.new_message
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(upstreamPayload)
      });

      if (!response.ok) {
        if (response.status === 404) {
          const errorMsg = await response.text();
          console.warn("[Proxy] Upstream session not found (404):", errorMsg);
          return res.status(404).json({
            error: "SessionNotFound",
            details: errorMsg
          });
        }
        throw new Error(`Upstream returned response code ${response.status}`);
      }

      const text = await response.text();
      res.send(text);
    } catch (error: any) {
      console.error("[Proxy Error] Run request failed:", error);
      res.status(502).json({ 
        error: "Failed to post message to upstream port agent API", 
        details: error.message 
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
