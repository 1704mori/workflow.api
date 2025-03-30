export type NodeInput = {
  id: string;
  label: string;
  type: string;
  required?: boolean;
  default?: any;
  description?: string;
};

export type NodeOutput = {
  id: string;
  label: string;
  type: string;
  description?: string;
};

export type NodeDefinition = {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  icon?: string;
  inputs: NodeInput[];
  outputs: NodeOutput[];
  defaults?: Record<string, any>;
};

export type NodeInstance = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    inputs: Record<string, any>;
  };
};

export type NodeConnection = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};

export type WorkflowData = {
  nodes: NodeInstance[];
  edges: NodeConnection[];
};

export type ExecutionContext = {
  nodeId: string;
  workflowId: string;
  executionId: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  logger: {
    info: (message: string) => void;
    error: (message: string, error?: any) => void;
  };
};

export type NodeProcessor = {
  process: (
    inputs: Record<string, any>,
    context: ExecutionContext
  ) => Promise<Record<string, any>>;
};

export interface ExecutionNode {
  id: string;
  executed: boolean;
  type: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  error?: any;
  leadRecord?: any; // Add this to track lead records
}
