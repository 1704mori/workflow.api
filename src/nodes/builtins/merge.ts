import type { NodeDefinition, NodeProcessor } from "../types.js";

export const definition: NodeDefinition = {
  id: "merge",
  name: "Merge",
  description: "Merge multiple inputs into a single output",
  category: "data",
  version: "1.0.0",
  icon: "git-merge",
  inputs: [
    {
      id: "input1",
      label: "Input 1",
      type: "any",
      required: true,
      description: "First input to merge",
    },
    {
      id: "input2",
      label: "Input 2",
      type: "any",
      required: true,
      description: "Second input to merge",
    },
    {
      id: "strategy",
      label: "Merge Strategy",
      type: "string",
      required: true,
      default: "array",
      description: "How to merge inputs (array, object, concat)",
    },
  ],
  outputs: [
    {
      id: "result",
      label: "Result",
      type: "any",
      description: "Merged result",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { input1, input2, strategy } = inputs;

    let result;
    switch (strategy) {
      case "array":
        result = [input1, input2];
        break;
      case "object":
        result = { ...input1, ...input2 };
        break;
      case "concat":
        if (Array.isArray(input1) && Array.isArray(input2)) {
          result = [...input1, ...input2];
        } else if (typeof input1 === "string" && typeof input2 === "string") {
          result = input1 + input2;
        } else {
          throw new Error("Inputs must be arrays or strings for concat strategy");
        }
        break;
      default:
        throw new Error(`Unknown merge strategy: ${strategy}`);
    }

    context.logger.info(`Merged inputs using strategy: ${strategy}`);
    return { result };
  },
};

export default { definition, processor };
