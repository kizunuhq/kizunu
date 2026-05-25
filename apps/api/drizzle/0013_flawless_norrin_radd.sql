CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"journey_id" uuid,
	"kind" varchar(60) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_journey_id_lead_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."lead_journeys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_workspace_created_idx" ON "audit_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_events_journey_created_idx" ON "audit_events" USING btree ("journey_id","created_at");