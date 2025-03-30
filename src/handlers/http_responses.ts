import { Hono } from "hono";
import { db } from "../db/index.js";
import { httpResponses } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();

app.use("/*", authMiddleware);

app.get("/", async (c) => {
  const nodeId = c.req.query("nodeId");
  if (!nodeId) {
    return c.json({ error: "nodeId is required" }, 400);
  }

  try {
    const responses = await db
      .select()
      .from(httpResponses)
      .where(eq(httpResponses.nodeId, nodeId))
      .orderBy(httpResponses.createdAt)
      .limit(10);

    return c.json(responses);
  } catch (error) {
    console.error("Error fetching HTTP responses:", error);
    return c.json({ error: "Failed to fetch HTTP responses" }, 500);
  }
});

export default app;
