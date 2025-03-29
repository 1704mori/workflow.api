import type { NodeInstance, ExecutionContext, WorkflowData } from "../types.js";
import { nodeRegistry } from "../registry.js";
import { db } from "../../db/index.js";
import { workflowExecutions } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { interpolateObject } from "../../utils/template.js";

interface ExecutionNode {
  id: string;
  executed: boolean;
  type: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: any;
}

interface ExecutionState {
  nodes: Record<string, ExecutionNode>;
  startedAt: Date;
  completedAt?: Date;
  status: "pending" | "running" | "completed" | "failed";
  logs: Array<{
    timestamp: Date;
    level: string;
    message: string;
    nodeId?: string;
  }>;
  result?: any;
}

export class FlowEngine {
  async executeWorkflow(
    workflowId: string,
    flowData: WorkflowData,
    initialInputs: Record<string, any> = {}
  ): Promise<string> {
    // Create execution record
    const executionId = randomUUID();
    await db.insert(workflowExecutions).values({
      id: executionId,
      workflowId,
      status: "pending",
      logs: [],
    });

    // Execute in background
    this.runExecution(executionId, workflowId, flowData, initialInputs).catch(
      (error) => {
        console.error(`Workflow execution error: ${error}`);
      }
    );

    return executionId;
  }

  private async runExecution(
    executionId: string,
    workflowId: string,
    flowData: WorkflowData,
    initialInputs: Record<string, any>
  ): Promise<void> {
    // Initialize execution state
    const state: ExecutionState = {
      nodes: {},
      startedAt: new Date(),
      status: "running",
      logs: [],
    };

    // Update execution status
    await db
      .update(workflowExecutions)
      .set({ status: "running" })
      .where(eq(workflowExecutions.id, executionId));

    // Initialize nodes state
    for (const node of flowData.nodes) {
      state.nodes[node.id] = {
        id: node.id,
        executed: false,
        type: node.type,
        inputs: { ...node.data.inputs },
        outputs: {},
      };
    }

    // Find trigger nodes or entry points
    const entryNodes = flowData.nodes.filter(
      (node) => !flowData.edges.some((edge) => edge.target === node.id)
    );

    try {
      // Process initial inputs for entry nodes
      for (const entryNode of entryNodes) {
        const nodeState = state.nodes[entryNode.id];
        nodeState.inputs = {
          ...nodeState.inputs,
          ...initialInputs,
        };
      }

      // Execute the workflow
      await this.processNodes(
        entryNodes,
        flowData,
        state,
        executionId,
        workflowId
      );

      // Update execution as completed
      state.status = "completed";
      state.completedAt = new Date();

      await db
        .update(workflowExecutions)
        .set({
          status: "completed",
          completedAt: state.completedAt,
          logs: state.logs,
          result: this.getWorkflowResult(flowData, state),
        })
        .where(eq(workflowExecutions.id, executionId));
    } catch (error) {
      // Update execution as failed
      state.status = "failed";
      state.completedAt = new Date();
      state.logs.push({
        timestamp: new Date(),
        level: "error",
        message: `Workflow execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });

      await db
        .update(workflowExecutions)
        .set({
          status: "failed",
          completedAt: state.completedAt,
          logs: state.logs,
        })
        .where(eq(workflowExecutions.id, executionId));
    }
  }

  private async processNodes(
    nodesToProcess: NodeInstance[],
    flowData: WorkflowData,
    state: ExecutionState,
    executionId: string,
    workflowId: string
  ): Promise<void> {
    for (const node of nodesToProcess) {
      await this.processNode(node, flowData, state, executionId, workflowId);
    }
  }

  private async processNode(
    node: NodeInstance,
    flowData: WorkflowData,
    state: ExecutionState,
    executionId: string,
    workflowId: string
  ): Promise<void> {
    const nodeState = state.nodes[node.id];

    // Skip if already executed
    if (nodeState.executed) {
      return;
    }

    // Check if all input edges have been processed
    const inputEdges = flowData.edges.filter((edge) => edge.target === node.id);

    // For each input edge, ensure the source node has been executed
    for (const edge of inputEdges) {
      const sourceNodeState = state.nodes[edge.source];
      if (!sourceNodeState.executed) {
        // Source node not executed yet, find the source node instance
        const sourceNode = flowData.nodes.find((n) => n.id === edge.source);
        if (sourceNode) {
          // Process the source node first
          await this.processNode(
            sourceNode,
            flowData,
            state,
            executionId,
            workflowId
          );
        }
      }

      // Map outputs from source to inputs for target
      if (sourceNodeState.executed && !sourceNodeState.error) {
        const sourceOutput = sourceNodeState.outputs[edge.sourceHandle];
        if (sourceOutput !== undefined) {
          const targetInput = edge.targetHandle;
          nodeState.inputs[targetInput] = sourceOutput;
        }
      }
    }

    // Create execution context
    const context: ExecutionContext = {
      nodeId: node.id,
      workflowId,
      executionId,
      inputs: { ...nodeState.inputs },
      outputs: {},
      logger: {
        info: (message: string) => {
          state.logs.push({
            timestamp: new Date(),
            level: "info",
            message,
            nodeId: node.id,
          });
        },
        error: (message: string, error?: any) => {
          state.logs.push({
            timestamp: new Date(),
            level: "error",
            message: `${message}: ${
              error instanceof Error ? error.message : String(error)
            }`,
            nodeId: node.id,
          });
        },
      },
    };

    try {
      // Get node processor
      const processor = nodeRegistry.getProcessor(node.type);
      if (!processor) {
        throw new Error(`No processor found for node type: ${node.type}`);
      }

      // Create template context by spreading the inputs directly
      const templateContext: Record<string, any> = {
        ...context.inputs, // Include all inputs at root level
        body: context.inputs.body || {}, // Ensure body is available both at root and as body
        query: context.inputs.query || {},
        headers: context.inputs.headers || {},
        params: context.inputs.params || {},
      };
      console.log("templateContext", templateContext)

      // Add outputs from source nodes to template context
      const sourceNodes = inputEdges.map(edge => state.nodes[edge.source]);
      for (const sourceNode of sourceNodes) {
        if (sourceNode.executed && !sourceNode.error) {
          console.log("xaxaxa", sourceNode.outputs)
          templateContext[sourceNode.id] = sourceNode.outputs;
        }
      }

      console.log("sourceNodes", sourceNodes)
      // Process template strings in inputs
      const processedInputs = interpolateObject(nodeState.inputs, templateContext);
      console.log("processedInputs", processedInputs)

      // Process node with interpolated inputs
      context.logger.info(`Executing node: ${node.data.label || node.type}`);
      const outputs = await processor.process(processedInputs, context);

      // Save outputs
      nodeState.outputs = outputs || {};
      nodeState.executed = true;

      // Process next nodes
      const outputEdges = flowData.edges.filter(
        (edge) => edge.source === node.id
      );
      const nextNodes = outputEdges
        .map((edge) => flowData.nodes.find((n) => n.id === edge.target))
        .filter((n): n is NodeInstance => n !== undefined);

      await this.processNodes(
        nextNodes,
        flowData,
        state,
        executionId,
        workflowId
      );
    } catch (error) {
      // Save error and mark as executed (with error)
      nodeState.error = error instanceof Error ? error.message : String(error);
      nodeState.executed = true;
      context.logger.error(`Node execution failed`, error);

      // Don't process next nodes if this one failed
      throw error;
    }
  }

  private getWorkflowResult(
    flowData: WorkflowData,
    state: ExecutionState
  ): any {
    // Find exit/end nodes (nodes that don't have any outgoing connections)
    const exitNodes = flowData.nodes.filter(
      (node) => !flowData.edges.some((edge) => edge.source === node.id)
    );

    if (exitNodes.length === 0) {
      return null;
    }

    if (exitNodes.length === 1) {
      // If there's only one exit node, return its outputs
      const exitNode = exitNodes[0];
      const exitNodeState = state.nodes[exitNode.id];
      return exitNodeState.outputs;
    }

    // If there are multiple exit nodes, return an object with each exit node's outputs
    const result: Record<string, any> = {};
    for (const exitNode of exitNodes) {
      const exitNodeState = state.nodes[exitNode.id];
      if (exitNodeState.executed && !exitNodeState.error) {
        result[exitNode.id] = exitNodeState.outputs;
      }
    }

    return result;
  }
}

export const flowEngine = new FlowEngine();
