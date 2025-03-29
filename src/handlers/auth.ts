import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  comparePasswords,
  generateToken,
  hashPassword,
} from "../utils/auth.js";
import { randomUUID } from "node:crypto";
import { authMiddleware } from "../middleware/auth.js";

const app = new Hono();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

app.post(
  "/signup",
  validator("json", (value, c) => {
    const parsed = signupSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: parsed.error }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { email, password } = c.req.valid("json");

    try {
      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        return c.json({ error: "Email already registered" }, 400);
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const userId = randomUUID();

      await db.insert(users).values({
        id: userId,
        email,
        password: hashedPassword,
      });

      // Generate token
      const token = await generateToken(userId);

      return c.json({ token });
    } catch (error) {
      console.error("Signup error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

app.post(
  "/signin",
  validator("json", (value, c) => {
    const parsed = signinSchema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: parsed.error.message }, 400);
    }
    return parsed.data;
  }),
  async (c) => {
    const { email, password } = c.req.valid("json");

    try {
      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!user) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      // Verify password
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return c.json({ error: "Invalid credentials" }, 401);
      }

      // Generate token
      const token = await generateToken(user.id);

      return c.json({ token });
    } catch (error) {
      console.error("Signin error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  }
);

// Protected route example
app.get("/me", authMiddleware, async (c) => {
  const userId = c.get<any>("userId");

  try {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    return c.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
