import { pgTable, serial, text, boolean, timestamp, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionId: text("subscription_id"),
  subscriptionStatus: text("subscription_status"),
  planTier: text("plan_tier"),
  discordUserId: text("discord_user_id"),
  discordUsername: text("discord_username"),
  isAdmin: boolean("is_admin").notNull().default(false),
  trialStartedAt: timestamp("trial_started_at"),
  manualTrialEndsAt: timestamp("manual_trial_ends_at"),
  gettingStartedCompleted: text("getting_started_completed"),
  reviewSubmissionUrl: text("review_submission_url"),
  reviewLeftAt: timestamp("review_left_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const cancellationSurveysTable = pgTable("cancellation_surveys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  reason: text("reason").notNull(),
  offerAccepted: boolean("offer_accepted").notNull().default(false),
  cancelledAt: timestamp("cancelled_at").defaultNow().notNull(),
});

export const insertCancellationSurveySchema = createInsertSchema(
  cancellationSurveysTable,
).omit({ id: true });
export type InsertCancellationSurvey = z.infer<
  typeof insertCancellationSurveySchema
>;
export type CancellationSurvey = typeof cancellationSurveysTable.$inferSelect;

export const discordSyncLogsTable = pgTable("discord_sync_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  discordUserId: text("discord_user_id"),
  action: text("action").notNull(), // "assign_role" | "revoke_role"
  stripeEvent: text("stripe_event"),
  success: boolean("success").notNull(),
  errorMessage: text("error_message"),
  attempts: integer("attempts").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DiscordSyncLog = typeof discordSyncLogsTable.$inferSelect;

export const emailJobsTable = pgTable("email_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => usersTable.id)
    .notNull(),
  email: text("email").notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  jobType: text("job_type").notNull(), // "winback_1" | "winback_2" | "winback_3"
  token: text("token").notNull().unique(), // cryptographically random, used in public tracking URLs
  sendAt: timestamp("send_at").notNull(),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  stripePromoCode: text("stripe_promo_code"),
  cancelled: boolean("cancelled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmailJob = typeof emailJobsTable.$inferSelect;

export const tradrxStatsCacheTable = pgTable("tradrx_stats_cache", {
  id: serial("id").primaryKey(),
  winRate: integer("win_rate"),
  avgMonthlyReturnMin: integer("avg_monthly_return_min"),
  avgMonthlyReturnMax: integer("avg_monthly_return_max"),
  tradesPerMonth: integer("trades_per_month"),
  profitFactor: doublePrecision("profit_factor"),
  bestStreak: integer("best_streak"),
  totalTrades: integer("total_trades"),
  btcWinRate: integer("btc_win_rate"),
  ethWinRate: integer("eth_win_rate"),
  solWinRate: integer("sol_win_rate"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TradrxStatsCache = typeof tradrxStatsCacheTable.$inferSelect;

export const supportTicketsTable = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  clerkId: text("clerk_id").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("open"), // "open" | "closed"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;

export * from "./conversations";
export * from "./messages";
