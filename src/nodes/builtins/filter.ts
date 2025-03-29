import type { NodeDefinition, NodeProcessor } from "../types.js";

export const definition: NodeDefinition = {
  id: "filter",
  name: "Filter",
  description: "Filter array items based on a condition",
  category: "data",
  version: "1.0.0",
  icon: "filter",
  inputs: [
    {
      id: "array",
      label: "Array",
      type: "array",
      required: true,
      description: "Array to filter",
    },
    {
      id: "key",
      label: "Key",
      type: "string",
      required: true,
      description: "Object key to compare (for array of objects)",
    },
    {
      id: "operator",
      label: "Operator",
      type: "string",
      required: true,
      default: "equals",
      description: "Comparison operator",
    },
    {
      id: "value",
      label: "Value",
      type: "any",
      required: true,
      description: "Value to compare against",
    },
  ],
  outputs: [
    {
      id: "filtered",
      label: "Filtered Array",
      type: "array",
      description: "Filtered results",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { array, key, operator, value } = inputs;

    if (!Array.isArray(array)) {
      throw new Error("Input must be an array");
    }

    const filtered = array.filter((item) => {
      const itemValue = key ? item[key] : item;

      switch (operator) {
        case "equals":
          return itemValue === value;
        case "not_equals":
          return itemValue !== value;
        case "greater_than":
          return itemValue > value;
        case "less_than":
          return itemValue < value;
        case "contains":
          return String(itemValue).includes(String(value));
        default:
          throw new Error(`Unknown operator: ${operator}`);
      }
    });

    context.logger.info(`Filtered array from ${array.length} to ${filtered.length} items`);
    return { filtered };
  },
};

export default { definition, processor };
