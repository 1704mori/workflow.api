import type { NodeDefinition, NodeProcessor } from "../types.js";
import { db } from "../../db/index.js";
import { httpResponses } from "../../db/schema.js";

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
    {
      id: "message",
      label: "Message Data",
      type: "json",
      description: "Additional message data",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { body, query, headers, method, params, message } = inputs;

    context.logger.info(`Processing HTTP request: ${method} with ${Object.keys(inputs).length} inputs`);

    // Save HTTP response data
    await db.insert(httpResponses).values({
      workflowId: context.workflowId,
      executionId: context.executionId,
      nodeId: context.nodeId,
      body: body || {},
      query: query || {},
      headers: headers || {},
      method: method || 'GET',
      params: params || {},
      leadId: inputs.leadId,
    });

    // We want the message data to be accessible via the 'output' handle
    return {
      output: {
        message: message || {},
        body: body || {},
        query: query || {},
        headers: headers || {},
        method: method || 'GET',
        params: params || {},
      }
    };
  },
};

export default { definition, processor };
