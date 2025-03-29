import type { NodeDefinition, NodeProcessor } from "../types.js";

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
  ],
};

export const processor: NodeProcessor = {
  async process(inputs, context) {
    const { method, url, headers, body } = inputs;
    
    context.logger.info(`Making HTTP ${method} request to ${url}`);
    console.log("body", body)

    try {
      const requestHeaders = { ...headers };
      let requestBody: any = undefined;

      // Only stringify body if it exists and the method isn't GET
      if (body && method !== 'GET') {
        requestBody = JSON.stringify(body);
      }

      const response = await fetch(url, {
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

      return {
        response: responseData,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error: any) {
      context.logger.error("HTTP request failed", error);
      throw error;
    }
  },
};

export default { definition, processor };
