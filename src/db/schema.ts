import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  workflows: many(workflows),
}));

export const workflows = pgTable("workflows", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  isActive: boolean("is_active").default(false).notNull(),
  flowData: jsonb("flow_data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workflowsRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  executions: many(workflowExecutions),
}));

export const workflowExecutions = pgTable("workflow_executions", {
  id: uuid("id").defaultRandom().primaryKey(),
  workflowId: uuid("workflow_id")
    .notNull()
    .references(() => workflows.id),
  status: varchar("status", { length: 50 }).notNull(), // 'pending', 'running', 'completed', 'failed'
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  logs: jsonb("logs").default([]),
  result: jsonb("result"),
});

export const workflowExecutionsRelations = relations(
  workflowExecutions,
  ({ one }) => ({
    workflow: one(workflows, {
      fields: [workflowExecutions.workflowId],
      references: [workflows.id],
    }),
  })
);

export const nodeDefinitions = pgTable("node_definitions", {
  id: varchar("id", { length: 100 }).primaryKey(), // e.g., 'http_request', 'data_transform', etc.
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(), // 'triggers', 'actions', 'logic', etc.
  version: varchar("version", { length: 50 }).notNull(),
  schema: jsonb("schema").notNull(), // Input/output schema
  defaults: jsonb("defaults"), // Default configuration
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// This table stores static assets like icons for nodes
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey(),
  nodeDefinitionId: varchar("node_definition_id", { length: 100 }).references(
    () => nodeDefinitions.id
  ),
  type: varchar("type", { length: 50 }).notNull(), // 'icon', 'documentation', etc.
  url: varchar("url", { length: 1000 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
