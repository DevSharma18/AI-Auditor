import type { Express } from "express";
import { type Server } from "http";
import { createProxyMiddleware } from "http-proxy-middleware";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  const apiProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:8000',
    changeOrigin: true,
    ws: false,
    proxyTimeout: 10000,
    timeout: 10000,
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      if (res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend unavailable', details: err.message }));
      }
    },
    onProxyReq: (proxyReq, req) => {
      console.log(`Proxying: ${req.method} ${req.url} -> http://127.0.0.1:8000${req.url}`);
    }
  });

  app.use('/api', apiProxy);

  return httpServer;
}
