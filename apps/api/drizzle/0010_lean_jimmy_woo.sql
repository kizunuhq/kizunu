CREATE TABLE "member_connector_identities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"membership_id" uuid NOT NULL,
	"connector_account_id" uuid NOT NULL,
	"external_id" varchar(120) NOT NULL,
	"created_by" varchar(80) NOT NULL,
	"source_email" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "lead_journeys" ADD COLUMN "error_reason" varchar(80);--> statement-breakpoint
ALTER TABLE "member_connector_identities" ADD CONSTRAINT "member_connector_identities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_connector_identities" ADD CONSTRAINT "member_connector_identities_membership_id_memberships_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."memberships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_connector_identities" ADD CONSTRAINT "member_connector_identities_connector_account_id_connector_accounts_id_fk" FOREIGN KEY ("connector_account_id") REFERENCES "public"."connector_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mci_account_external_idx" ON "member_connector_identities" USING btree ("connector_account_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mci_account_membership_idx" ON "member_connector_identities" USING btree ("connector_account_id","membership_id");