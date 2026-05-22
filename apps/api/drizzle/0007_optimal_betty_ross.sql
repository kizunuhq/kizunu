CREATE TABLE "touch_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lead_journey_id" uuid NOT NULL,
	"step_order" integer NOT NULL,
	"status" varchar(20) NOT NULL,
	"external_message_id" varchar(255),
	"external_activity_id" varchar(255),
	"error" text
);
--> statement-breakpoint
ALTER TABLE "touch_attempts" ADD CONSTRAINT "touch_attempts_lead_journey_id_lead_journeys_id_fk" FOREIGN KEY ("lead_journey_id") REFERENCES "public"."lead_journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "touch_attempts_journey_step_idx" ON "touch_attempts" USING btree ("lead_journey_id","step_order");