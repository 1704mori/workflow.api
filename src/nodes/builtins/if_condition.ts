import type { NodeDefinition, NodeProcessor } from "../types.js";

export const definition: NodeDefinition = {
  id: "if_condition",
  name: "If Condition",
  description: "Conditionally route data based on a condition",
  category: "logic",
  version: "1.0.0",
  icon: "binary",
  inputs: [
    {
      id: "value",
      label: "Value",
      type: "any",
      required: true,
      description: "Value to evaluate",
    },
    {
      id: "operator",
      label: "Operator",
      type: "string",
      required: true,
      default: "equals",
      description:
        "Comparison operator (equals, not_equals, greater_than, less_than, contains, etc.)",
    },
    {
      id: "comparison",
      label: "Comparison Value",
      type: "any",
      required: true,
      description: "Value to compare against",
    },
  ],
  outputs: [
    {
      id: "true",
      label: "True",
      type: "any",
      description: "Output if condition is true",
    },
    {
      id: "false",
      label: "False",
      type: "any",
      description: "Output if condition is false",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { value, operator, comparison } = inputs;
    let result = false;

    switch (operator) {
      case "equals":
        result = value === comparison;
        break;
      case "not_equals":
        result = value !== comparison;
        break;
      case "greater_than":
        result = value > comparison;
        break;
      case "less_than":
        result = value < comparison;
        break;
      case "greater_than_or_equal":
        result = value >= comparison;
        break;
      case "less_than_or_equal":
        result = value <= comparison;
        break;
      case "contains":
        if (typeof value === "string") {
          result = value.includes(comparison);
        } else if (Array.isArray(value)) {
          result = value.includes(comparison);
        } else if (typeof value === "object" && value !== null) {
          result = comparison in value;
        }
        break;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }

    context.logger.info(`If condition evaluated to: ${result}`);

    return {
      true: result ? inputs.value : undefined,
      false: !result ? inputs.value : undefined,
    };
  },
};

export default { definition, processor };
