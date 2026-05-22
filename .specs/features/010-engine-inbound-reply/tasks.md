# Engine Inbound Reply Tasks

## T1 — config + repo seams — RPL-02
`api.config` meta.verifyToken; `LeadJourneyRepository.findRunningByLeadPhone`;
`ChannelAccountRepository.findByPluginAndCredential`.
Gate: typecheck.

## T2 — MarkReplyUseCase — RPL-02, RPL-03
Lock journey, transition -> replied under the row lock, run onReply via the executor.
Gate: typecheck.

## T3 — Meta webhook controller + wiring — RPL-01, RPL-02
`meta-webhook.controller.ts` (@Public GET verify + POST route via parseInbound + phone_number_id);
`Routes.webhooks.meta`; register MarkReplyUseCase in engine.module.
Gate: `bun check`.

## T4 — tests (generate-tests) — RPL-01..03
Integration: MarkReplyUseCase (running -> replied + onReply; terminal -> no-op; no match -> no-op).
Gate: `bun check` + CI lint.

## T5 — docs
ROADMAP/STATE/STRUCTURE/INTEGRATIONS (Meta inbound built); note paused_owner_inactive deferred.
Gate: `bun check`.
</content>
