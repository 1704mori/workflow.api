import type { NodeDefinition, NodeProcessor } from "../types.js";
import { interpolateValue } from "../utils.js";

export const definition: NodeDefinition = {
  id: "http_request",
  name: "HTTP Request",
  description: "Make an HTTP request to a URL",
  category: "actions",
  version: "1.0.0",
  icon: "send",
  inputs: [
    {
      id: "method",
      label: "Method",
      type: "string",
      required: true,
      default: "GET",
      description: "HTTP method (GET, POST, PUT, DELETE, etc.)",
    },
    {
      id: "url",
      label: "URL",
      type: "string",
      required: true,
      description: "URL to request",
    },
    {
      id: "headers",
      label: "Headers",
      type: "json",
      default: {},
      description: "HTTP headers as JSON object",
    },
    {
      id: "body",
      label: "Body",
      type: "json",
      description: "Request body as JSON",
    },
  ],
  outputs: [
    {
      id: "response",
      label: "Response",
      type: "json",
      description: "HTTP response data",
    },
    {
      id: "status",
      label: "Status Code",
      type: "number",
      description: "HTTP status code",
    },
    {
      id: "headers",
      label: "Response Headers",
      type: "json",
      description: "HTTP response headers",
    },
    {
      id: "message",
      label: "Message Data",
      type: "json",
      description: "Preserved message data",
    },
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { method, url, headers, body } = inputs;
    
    // Get message data directly from context inputs
    const messageData = context.inputs.message || {};
    
    context.logger.info(`Processing with message data: ${JSON.stringify(messageData)}`);
    
    // Interpolate values in the request configuration
    const interpolatedBody = interpolateValue(body, messageData);
    const interpolatedUrl = interpolateValue(url, messageData);
    const interpolatedHeaders = interpolateValue(headers, messageData);
    
    context.logger.info(`Making HTTP ${method} request to ${interpolatedUrl}`);
    context.logger.info(`With body: ${JSON.stringify(interpolatedBody)}`);

    try {
      const requestHeaders = {
        'Content-Type': 'application/json',
        ...interpolatedHeaders
      };
      let requestBody: any = undefined;

      // Only stringify body if it exists and the method isn't GET
      if (interpolatedBody && method !== 'GET') {
        requestBody = JSON.stringify(interpolatedBody);
      }

      const response = await fetch(interpolatedUrl, {
        method,
        headers: requestHeaders,
        body: requestBody,
      });

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      // Pass through message data in outputs
      return {
        response: responseData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        message: messageData // Preserve message data
      };
    } catch (error: any) {
      context.logger.error("HTTP request failed", error);
      throw error;
    }
  },
};

export default { definition, processor };
