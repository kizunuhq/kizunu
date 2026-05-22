CREATE TABLE "connector_accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"connector_id" varchar(100) NOT NULL,
	"name" varchar(120) NOT NULL,
	"credentials" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connector_accounts" ADD CONSTRAINT "connector_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connector_accounts_workspace_idx" ON "connector_accounts" USING btree ("workspace_id");