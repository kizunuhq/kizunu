CREATE TABLE "entry_triggers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connector_account_id" uuid NOT NULL,
	"pipeline_id" varchar(100),
	"stage_id" varchar(100) NOT NULL,
	"cadence_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry_triggers" ADD CONSTRAINT "entry_triggers_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_triggers" ADD CONSTRAINT "entry_triggers_connector_account_id_connector_accounts_id_fk" FOREIGN KEY ("connector_account_id") REFERENCES "public"."connector_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_triggers" ADD CONSTRAINT "entry_triggers_cadence_id_cadences_id_fk" FOREIGN KEY ("cadence_id") REFERENCES "public"."cadences"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "entry_triggers_account_stage_idx" ON "entry_triggers" USING btree ("connector_account_id","stage_id");--> statement-breakpoint
CREATE INDEX "entry_triggers_workspace_idx" ON "entry_triggers" USING btree ("workspace_id");