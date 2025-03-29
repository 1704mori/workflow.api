import { Hono } from "hono";
import { nodeRegistry } from "../nodes/registry.js";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();

// Apply auth middleware to all routes
app.use("/*", authMiddleware);

// Get all node definitions
app.get("/", async (c) => {
  try {
    const definitions = nodeRegistry.getAllDefinitions();
    return c.json(definitions);
  } catch (error) {
    return c.json({ error: "Failed to fetch node definitions" }, 500);
  }
});

// Get node definitions by category
app.get("/category/:category", async (c) => {
  try {
    const category = c.req.param("category");
    const definitions = nodeRegistry.getDefinitionsByCategory(category);
    return c.json(definitions);
  } catch (error) {
    return c.json({ error: "Failed to fetch node definitions" }, 500);
  }
});

// Get single node definition
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const definition = nodeRegistry.getDefinition(id);
    if (!definition) {
      return c.json({ error: "Node definition not found" }, 404);
    }
    return c.json(definition);
  } catch (error) {
    return c.json({ error: "Failed to fetch node definition" }, 500);
  }
});

export default app;
