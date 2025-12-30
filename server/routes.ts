import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomModelSchema, insertAuditSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Models API
  app.get("/api/models", async (req, res) => {
    try {
      const models = await storage.getModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch models" });
    }
  });

  app.get("/api/models/:id", async (req, res) => {
    try {
      const model = await storage.getModel(req.params.id);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch model" });
    }
  });

  app.post("/api/models", async (req, res) => {
    try {
      const parsed = insertCustomModelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid model data", details: parsed.error.issues });
      }
      const model = await storage.createModel(parsed.data);
      res.status(201).json(model);
    } catch (error) {
      res.status(500).json({ error: "Failed to create model" });
    }
  });

  app.patch("/api/models/:id", async (req, res) => {
    try {
      const model = await storage.updateModel(req.params.id, req.body);
      if (!model) {
        return res.status(404).json({ error: "Model not found" });
      }
      res.json(model);
    } catch (error) {
      res.status(500).json({ error: "Failed to update model" });
    }
  });

  app.delete("/api/models/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteModel(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Model not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete model" });
    }
  });

  // Audits API
  app.get("/api/audits", async (req, res) => {
    try {
      const audits = await storage.getAudits();
      res.json(audits);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audits" });
    }
  });

  app.get("/api/audits/:id", async (req, res) => {
    try {
      const audit = await storage.getAudit(req.params.id);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      res.json(audit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit" });
    }
  });

  app.post("/api/audits", async (req, res) => {
    try {
      const parsed = insertAuditSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid audit data", details: parsed.error.issues });
      }
      const audit = await storage.createAudit(parsed.data);
      res.status(201).json(audit);
    } catch (error) {
      res.status(500).json({ error: "Failed to create audit" });
    }
  });

  app.patch("/api/audits/:id", async (req, res) => {
    try {
      const audit = await storage.updateAudit(req.params.id, req.body);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      res.json(audit);
    } catch (error) {
      res.status(500).json({ error: "Failed to update audit" });
    }
  });

  // Dashboard metrics API (static demo data)
  app.get("/api/metrics", async (req, res) => {
    res.json({
      totalModelsMonitored: 47,
      modelsUnderMonitoring: 12,
      overallAIRiskScore: 68,
      complianceReadinessScore: 82,
    });
  });

  return httpServer;
}
