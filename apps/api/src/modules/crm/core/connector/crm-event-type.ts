/**
 * Internal CRM event vocabulary. Connectors normalize provider webhooks into these
 * types so cadences and the engine never see Pipedrive (or any CRM) specifics.
 */
export type CrmEventType = 'lead.stage_entered'
