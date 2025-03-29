import { Hono } from "hono";
import { flowEngine } from "../nodes/flow/engine.js";
import { db } from "../db/index.js";
import { workflows } from "../db/schema.js";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth.js";
import { nodeRegistry } from "../nodes/registry.js";

const app = new Hono();

// Apply auth middleware to all routes
app.use("/*", authMiddleware);

function normalizeWorkflowData(flowData: any) {
  const normalized = {
    nodes: flowData.nodes.map((node: any) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        label: node.data.label || nodeRegistry.getDefinition(node.data.nodeType)?.name || "Unknown Node",
        inputs: node.data.inputs || {},
        nodeType: node.data.nodeType,
      },
    })),
    edges: flowData.edges.map((edge: any) => ({
      id: edge.id,
      source: edge.source,
      sourceHandle: edge.sourceHandle || 'body', // Default to 'body' if not specified
      target: edge.target,
      targetHandle: edge.targetHandle || 'body', // Default to 'body' if not specified
    })),
  };
  return normalized;
}

// Create workflow
app.post("/", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const body = await c.req.json();
    if (body.flowData) {
      body.flowData = normalizeWorkflowData(body.flowData);
    }
    const [workflow] = await db
      .insert(workflows)
      .values({ ...body, userId })
      .returning();
    return c.json(workflow, 201);
  } catch (error) {
    return c.json({ error: "Failed to create workflow" }, 500);
  }
});

// Get all workflows
app.get("/", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const workflowList = await db
      .select()
      .from(workflows)
      .where(eq(workflows.userId, userId));
    return c.json(workflowList);
  } catch (error) {
    return c.json({ error: "Failed to fetch workflows" }, 500);
  }
});

// Get single workflow
app.get("/:id", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const id = c.req.param("id");
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, userId)));
    if (!workflow) return c.json({ error: "Workflow not found" }, 404);
    return c.json(workflow);
  } catch (error) {
    return c.json({ error: "Failed to fetch workflow" }, 500);
  }
});

// Update workflow
app.put("/:id", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const id = c.req.param("id");
    const body = await c.req.json();
    if (body.flowData) {
      body.flowData = normalizeWorkflowData(body.flowData);
    }
    const [workflow] = await db
      .update(workflows)
      .set(body)
      .where(and(eq(workflows.id, id), eq(workflows.userId, userId)))
      .returning();
    if (!workflow) return c.json({ error: "Workflow not found" }, 404);
    return c.json(workflow);
  } catch (error) {
    return c.json({ error: "Failed to update workflow" }, 500);
  }
});

// Delete workflow
app.delete("/:id", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const id = c.req.param("id");
    const [workflow] = await db
      .delete(workflows)
      .where(and(eq(workflows.id, id), eq(workflows.userId, userId)))
      .returning();
    if (!workflow) return c.json({ error: "Workflow not found" }, 404);
    return c.json({ message: "Workflow deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete workflow" }, 500);
  }
});

app.post("/:id/trigger", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const workflowId = c.req.param("id");

    // Fetch workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));

    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    // Normalize workflow data before execution
    const normalizedFlowData = normalizeWorkflowData(workflow.flowData);

    // Log the normalized flow data for debugging
    console.log('Normalized flow data:', JSON.stringify(normalizedFlowData, null, 2));

    // Get request data
    const body = await c.req.json();
    const query = Object.fromEntries(new URL(c.req.url).searchParams);
    const headers = c.req.header(); //Object.fromEntries(c.req.header());
    const method = c.req.method;
    const params = c.req.param();

    // Prepare initial inputs for the HTTP response node
    const initialInputs = {
      body,
      query,
      headers,
      method,
      params,
    };

    // Execute workflow with normalized data
    const executionId = await flowEngine.executeWorkflow(
      workflowId,
      normalizedFlowData as any,
      initialInputs
    );

    return c.json(
      {
        message: "Workflow triggered successfully",
        executionId,
      },
      200
    );
  } catch (error) {
    console.error("Error triggering workflow:", error);
    return c.json(
      {
        error: "Failed to trigger workflow",
        details: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
});

export default app;
