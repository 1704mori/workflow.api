import type {
    NodeInstance,
    ExecutionContext,
    WorkflowData,
    ExecutionNode,
  } from "../types.js";
  import { nodeRegistry } from "../registry.js";
  import { db } from "../../db/index.js";
  import { workflowExecutions, leads } from "../../db/schema.js";
  import { eq, and } from "drizzle-orm";
  import { randomUUID } from "node:crypto";
  
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
  
    private async processNode(
      node: NodeInstance,
      flowData: WorkflowData,
      state: ExecutionState,
      executionId: string,
      workflowId: string
    ): Promise<void> {
      const nodeState = state.nodes[node.id];
  
      if (nodeState.executed) {
        return;
      }
  
      // Extract message data from initial inputs if this is a trigger node
      const nodeDef = nodeRegistry.getDefinition(node.type);
      const isTriggerNode = nodeDef?.category === "triggers";
      
      if (isTriggerNode) {
        // For trigger nodes, get message from initial inputs
        nodeState.inputs.message = nodeState.inputs.message || {};
      }
  
      // Process input edges
      const inputEdges = flowData.edges.filter((edge) => edge.target === node.id);
      for (const edge of inputEdges) {
        const sourceNodeState = state.nodes[edge.source];
        if (!sourceNodeState.executed) {
          const sourceNode = flowData.nodes.find((n) => n.id === edge.source);
          if (sourceNode) {
            await this.processNode(sourceNode, flowData, state, executionId, workflowId);
          }
        }
  
        if (sourceNodeState.executed && !sourceNodeState.error) {
          const sourceOutput = sourceNodeState.outputs[edge.sourceHandle];
          if (sourceOutput !== undefined) {
            nodeState.inputs[edge.targetHandle] = sourceOutput;
          }
          
          // Always propagate message data from source node
          if (sourceNodeState.outputs.message) {
            nodeState.inputs.message = sourceNodeState.outputs.message;
          }
        }
      }
  
      // Create context with message data
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
        const processor = nodeRegistry.getProcessor(node.type);
        if (!processor) {
          throw new Error(`No processor found for node type: ${node.type}`);
        }
  
        context.logger.info(`Executing node: ${node.data.label || node.type}`);
        const outputs = await processor.process(nodeState.inputs, context);
  
        // Combine outputs with message and lead data
        nodeState.outputs = {
          ...outputs,
          message: nodeState.inputs.message,
          ...(nodeState.inputs.leadId ? { leadId: nodeState.inputs.leadId } : {}),
        };
        nodeState.executed = true;
  
        // Update lead record if exists
        if (nodeState.leadRecord) {
          await db
            .update(leads)
            .set({
              status: "completed",
              data: {
                inputs: nodeState.inputs,
                outputs: nodeState.outputs,
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, nodeState.leadRecord.id));
        }
  
        await this.processNextNodes(
          node,
          flowData,
          state,
          executionId,
          workflowId
        );
      } catch (error) {
        nodeState.error = error instanceof Error ? error.message : String(error);
        nodeState.executed = true;
        context.logger.error(`Node execution failed`, error);
  
        if (nodeState.leadRecord) {
          await db
            .update(leads)
            .set({
              status: "failed",
              data: {
                inputs: nodeState.inputs,
                error: error instanceof Error ? error.message : String(error),
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, nodeState.leadRecord.id));
        }
  
        throw error;
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
  
    private async processNextNodes(
      node: NodeInstance,
      flowData: WorkflowData,
      state: ExecutionState,
      executionId: string,
      workflowId: string
    ): Promise<void> {
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
    }
  
    private getWorkflowResult(
      flowData: WorkflowData,
      state: ExecutionState
    ): any {
      const exitNodes = flowData.nodes.filter(
        (node) => !flowData.edges.some((edge) => edge.source === node.id)
      );
  
      if (exitNodes.length === 0) {
        return null;
      }
  
      if (exitNodes.length === 1) {
        const exitNode = exitNodes[0];
        const exitNodeState = state.nodes[exitNode.id];
        return exitNodeState.outputs;
      }
  
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
