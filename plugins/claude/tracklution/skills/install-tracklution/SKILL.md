---
name: install-tracklution
description: Use when the user asks to install, set up or verify Tracklution tracking on a website
---

# Install Tracklution Tracking

Follow this structured workflow to install and verify server-side tracking on the target website:

1. **Scout website hints:**
   Call `scout_website` with `website_url` to detect CMS/framework hints, suggested installation methods, and receive `onboarding_session_id`.

2. **Register or provision container:**
   Call `register_and_provision` with `website_url`, `framework`, `agent_client`, `onboarding_session_id`, and `idempotency_key` (UUID v7).
   - Captures the resulting or existing container (`container_id` and `container_hash`).

3. **Fetch tracking snippets:**
   Call `get_installation_scripts` with `container_id` and `framework`.
   - Inspect `framework_snippets`: apply `init` (loader), `page_view`, `purchase` (if checkout), `lead`, and `contact_info` (if login exists).
   - In environments with filesystem access, edit the project files directly to insert the snippets.
   - In chat environments without filesystem access, present the snippets clearly to the user.

4. **Select installation method:**
   Call `select_installation_method` with `container_id`, `method`, and an `idempotency_key` to persist the chosen setup.

5. **Verify and score:**
   Call `verify_and_score` with `container_id`, `idempotency_key`, and `onboarding_session_id`.
   - Follow status and `verification.not_ready_reason`.
   - On transient states (`no_events_after_install`, `script_not_seen`, `event_not_received_yet`), retry per `retry.retry_after_seconds`.
   - Day-0 statuses like `only_pageview_seen` mean tracking is active; proceed without looping.

6. **Next steps and hand-off:**
   Call `get_next_steps` with `container_id` to inspect remaining tasks (`overall_progress`, `next_steps[]`).
   Call `create_login_link` with `container_id` and `idempotency_key` to generate a one-time dashboard access link for the user.

## Operational Rules

- Respect tool instructions: follow `next_action`, `retry`, and `manual_handoff` fields from responses; never guess API endpoints.
- Never display `_sensitive_*` values in responses, except the one-time dashboard URL from `create_login_link` when the user requests access.
- For documentation, guides, or account recovery, direct users to https://www.tracklution.com/docs/tracklution-mcp/.
