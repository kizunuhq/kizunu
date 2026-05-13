# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in Kizunu, please report it through GitHub's private vulnerability reporting feature:

1. Go to the **Security** tab of this repository.
2. Click **Report a vulnerability**.
3. Provide details and steps to reproduce.

We will respond as quickly as possible and keep you informed throughout the process. Please do not disclose security vulnerabilities publicly until we have had a chance to address them.

## Scope

Kizunu handles channel credentials (WhatsApp providers, SMTP, etc.) and CRM tokens (Pipedrive and similar). The following are explicitly in scope:

- Exposure or unauthorized access to stored credentials or tokens.
- Authentication or session bypass.
- Data leakage across workspaces or memberships.
- Webhook spoofing or replay that bypasses idempotency checks.
- Injection (SQL, command, template, etc.) in any first-party plugin or connector shipped from this repository.
- Privilege escalation within a workspace.

Out of scope: vulnerabilities in third-party services (e.g., the Evolution API, Pipedrive itself) — please report those to the respective vendors.
