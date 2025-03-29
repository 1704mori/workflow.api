import http_request from "./builtins/http_request.js";
import if_condition from "./builtins/if_condition.js";
import switch_condition from "./builtins/switch_condition.js";
import http_response from "./builtins/http_response.js";
import merge from "./builtins/merge.js";
import filter from "./builtins/filter.js";
import delay from "./builtins/delay.js";
// import email_send from "./builtins/email_send.js";
import type { NodeDefinition, NodeProcessor } from "./types.js";

class NodeRegistry {
  private definitions: Map<string, NodeDefinition> = new Map();
  private processors: Map<string, NodeProcessor> = new Map();

  constructor() {
    this.registerBuiltInNodes()
  }

  registerBuiltInNodes(): void {
    // Register core built-in nodes
    this.registerNode(http_request);
    this.registerNode(http_response);
    this.registerNode(if_condition);
    this.registerNode(switch_condition);
    this.registerNode(merge);
    this.registerNode(filter);
    this.registerNode(delay);
    // this.registerNode(email_send);
  }

  registerNode(nodeModule: {
    definition: NodeDefinition;
    processor: NodeProcessor;
  }): void {
    const { definition, processor } = nodeModule;
    this.definitions.set(definition.id, definition);
    this.processors.set(definition.id, processor);
  }

  getDefinition(nodeType: string): NodeDefinition | undefined {
    return this.definitions.get(nodeType);
  }

  getProcessor(nodeType: string): NodeProcessor | undefined {
    return this.processors.get(nodeType);
  }

  getAllDefinitions(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  getDefinitionsByCategory(category: string): NodeDefinition[] {
    return Array.from(this.definitions.values()).filter(
      (def) => def.category === category
    );
  }
}

export const nodeRegistry = new NodeRegistry();
