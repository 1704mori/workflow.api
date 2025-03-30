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

// example:
// curl -X POST localhost:3000/workflows/6ad17e02-2309-4145-b441-f83a988cc100/trigger -H 'Content-Type: application/json' -H "Authorization: Bearer $MGFY_AUTH_TOKEN" -d '{"someKey": "someValue123", "lead": {"leadId": "123", "name": "test lead", "source": "local"}}' | jq
app.post("/:id/trigger", async (c) => {
  try {
    const userId = c.get<any>("userId");
    const workflowId = c.req.param("id");
    const requestBody = await c.req.json();

    // Extract lead and message data
    const leadData = requestBody.lead;
    const messageData = requestBody.message || {};

    if (!leadData || !leadData.leadId) {
      return c.json({ error: "lead.leadId is required in the request body" }, 400);
    }

    // Fetch workflow
    const [workflow] = await db
      .select()
      .from(workflows)
      .where(and(eq(workflows.id, workflowId), eq(workflows.userId, userId)));

    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }

    const normalizedFlowData = normalizeWorkflowData(workflow.flowData);

    // Prepare initial inputs with lead and message data in proper structure
    const initialInputs = {
      body: requestBody,
      query: Object.fromEntries(new URL(c.req.url).searchParams),
      headers: c.req.header(),
      method: c.req.method,
      params: c.req.param(),
      lead: leadData,
      leadId: leadData.leadId,
      message: messageData  // Add message data for interpolation
    };

    // Execute workflow
    const executionId = await flowEngine.executeWorkflow(
      workflowId,
      normalizedFlowData as any,
      initialInputs
    );

    return c.json(
      {
        message: "Workflow triggered successfully",
        executionId,
        leadId: leadData.leadId,
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
