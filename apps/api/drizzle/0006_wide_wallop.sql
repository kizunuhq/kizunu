CREATE TYPE "public"."lead_journey_status" AS ENUM('running', 'paused', 'replied', 'exhausted', 'stopped', 'error_state', 'paused_owner_inactive');--> statement-breakpoint
CREATE TABLE "lead_journeys" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lead_id" uuid NOT NULL,
	"cadence_id" uuid NOT NULL,
	"status" "lead_journey_status" DEFAULT 'running' NOT NULL,
	"current_step_order" integer DEFAULT -1 NOT NULL,
	"next_touch_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connector_account_id" uuid NOT NULL,
	"external_id" varchar(120) NOT NULL,
	"owner_external_id" varchar(120),
	"owner_user_id" uuid,
	"name" varchar(255) NOT NULL,
	"phone" varchar(40)
);
--> statement-breakpoint
ALTER TABLE "lead_journeys" ADD CONSTRAINT "lead_journeys_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lead_journeys" ADD CONSTRAINT "lead_journeys_cadence_id_cadences_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."cadences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_connector_account_id_connector_accounts_id_fk" FOREIGN KEY ("connector_account_id") REFERENCES "public"."connector_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lead_journeys_status_next_touch_idx" ON "lead_journeys" USING btree ("status","next_touch_at");--> statement-breakpoint
CREATE UNIQUE INDEX "leads_account_external_idx" ON "leads" USING btree ("connector_account_id","external_id");