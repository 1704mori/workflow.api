import type { NodeDefinition, NodeProcessor } from "../types.js";

export const definition: NodeDefinition = {
  id: "http_response",
  name: "HTTP Response",
  description: "Handles incoming HTTP requests and triggers workflow execution",
  category: "triggers",
  version: "1.0.0",
  icon: "antenna",
  inputs: [],
  outputs: [
    {
      id: "body",
      label: "Request Body",
      type: "json",
      description: "The parsed JSON body from the request",
    },
    {
      id: "query",
      label: "Query Params",
      type: "json",
      description: "URL query parameters",
    },
    {
      id: "headers",
      label: "Request Headers",
      type: "json",
      description: "HTTP request headers",
    },
    {
      id: "method",
      label: "HTTP Method",
      type: "string",
      description: "The HTTP method used in the request",
    },
    {
      id: "params",
      label: "URL Parameters",
      type: "json",
      description: "URL path parameters",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    // The inputs will contain the HTTP request data passed from the workflow trigger
    const { body, query, headers, method, params } = inputs;

    context.logger.info(`Processing HTTP request: ${method} with ${Object.keys(inputs).length} inputs`);

    return {
      body, // Changed to just pass body directly
      query: query || {},
      headers: headers || {},
      method: method || 'GET',
      params: params || {},
    };
  },
};

export default { definition, processor };
