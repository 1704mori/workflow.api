import { createMiddleware } from "hono/factory";
import { verifyToken } from "../utils/auth.js";

export const authMiddleware = createMiddleware(async (c, next) => {
  try {
    const authHeader = c.req.header("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    // Add user info to context
    c.set("userId", decoded.sub);

    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized" }, 401);
  }
});
