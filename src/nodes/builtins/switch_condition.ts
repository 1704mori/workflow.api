import type { NodeDefinition, NodeProcessor } from "../types.js";

export const definition: NodeDefinition = {
  id: "switch",
  name: "Switch",
  description: "Route data to different outputs based on a value",
  category: "logic",
  version: "1.0.0",
  icon: "arrow-right-left",
  inputs: [
    {
      id: "value",
      label: "Value",
      type: "any",
      required: true,
      description: "Value to evaluate",
    },
    {
      id: "cases",
      label: "Cases",
      type: "json",
      required: true,
      default: {},
      description: "JSON object mapping cases to output names",
    },
  ],
  outputs: [
    {
      id: "case1",
      label: "Case 1",
      type: "any",
      description: "Output for case 1",
    },
    {
      id: "case2",
      label: "Case 2",
      type: "any",
      description: "Output for case 2",
    },
    {
      id: "case3",
      label: "Case 3",
      type: "any",
      description: "Output for case 3",
    },
    {
      id: "default",
      label: "Default",
      type: "any",
      description: "Output if no cases match",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { value, cases } = inputs;
    const result: Record<string, any> = {};

    // Initialize all outputs to undefined
    for (const outputKey in cases) {
      result[outputKey] = undefined;
    }
    result.default = undefined;

    // Find matching case
    let matched = false;
    for (const [caseValue, outputKey] of Object.entries(cases)) {
      if (value === caseValue || (caseValue === "null" && value === null)) {
        if (typeof outputKey === "string") {
          result[outputKey] = value;
          matched = true;
          context.logger.info(
            `Switch matched case "${caseValue}" -> "${outputKey}"`
          );
          break;
        }
      }
    }

    // If no case matched, use default
    if (!matched) {
      result.default = value;
      context.logger.info("Switch used default case");
    }

    return result;
  },
};

export default { definition, processor };
