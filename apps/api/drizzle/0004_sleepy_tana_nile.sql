CREATE TYPE "public"."channel_strategy" AS ENUM('lead_owner');--> statement-breakpoint
CREATE TYPE "public"."cadence_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "cadence_steps" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cadence_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"delay_minutes" integer NOT NULL,
	"jitter_minutes" integer DEFAULT 0 NOT NULL,
	"channel_strategy" "channel_strategy" DEFAULT 'lead_owner' NOT NULL,
	"channel_plugin_id" varchar(100) NOT NULL,
	"template_id" uuid
);
--> statement-breakpoint
CREATE TABLE "cadences" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"status" "cadence_status" DEFAULT 'active' NOT NULL,
	"stop_on_reply" boolean DEFAULT true NOT NULL,
	"on_reply" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"on_exhausted" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"on_complete" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_cadence_id_cadences_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."cadences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadence_steps" ADD CONSTRAINT "cadence_steps_template_id_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cadences" ADD CONSTRAINT "cadences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cadence_steps_cadence_order_idx" ON "cadence_steps" USING btree ("cadence_id","step_order");