import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./handlers/auth.js";
import workflow from "./handlers/workflow.js";
import nodes from "./handlers/nodes.js";
import http_responses from "./handlers/http_responses.js";

const app = new Hono();

// app.get('/', (c) => {
//   return c.text('Hello Hono!')
// })

app.use("*", cors());

app.route("/auth", auth);
app.route("/workflows", workflow);
app.route("/nodes", nodes);
app.route("/http-responses", http_responses);
// app.route('/node-definitions', authMiddleware, nodeDefinitionRoutes);
// app.route('/execute', authMiddleware, executeRoutes);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  }
);
