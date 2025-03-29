import type { NodeDefinition, NodeProcessor } from "../types.js";

export const definition: NodeDefinition = {
  id: "delay",
  name: "Delay",
  description: "Add a delay to workflow execution",
  category: "utility",
  version: "1.0.0",
  icon: "clock",
  inputs: [
    {
      id: "value",
      label: "Input Value",
      type: "any",
      required: true,
      description: "Value to pass through after delay",
    },
    {
      id: "delay",
      label: "Delay (ms)",
      type: "number",
      required: true,
      default: 1000,
      description: "Delay duration in milliseconds",
    },
  ],
  outputs: [
    {
      id: "value",
      label: "Output Value",
      type: "any",
      description: "Input value after delay",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { value, delay } = inputs;

    context.logger.info(`Delaying execution for ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    return { value };
  },
};

export default { definition, processor };
