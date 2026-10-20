---
name: tracklution-analytics
description: Use when the user asks about tracking data, events, sessions, conversions or data quality in Tracklution
---

# Tracklution Analytics Guidance

Use Tracklution MCP analytics tools to query conversion data, raw events, and tracking quality metrics:

1. **Locate containers:**
   Call `list_containers` first to find available tracking containers, domain names, and `container_id` identifiers.

2. **Aggregated metrics and performance trends:**
   - Call `get_summary` with `container_id` and ISO date ranges (`start_date`, `end_date`) for overall conversion counts, tracked revenue, and performance comparisons.
   - Call `get_report` with `container_id` for time-series breakdowns (e.g. daily, weekly) and dimension-specific aggregates.

3. **Data quality, health, and ad blocker recovery:**
   - Call `get_insights` with `container_id` to evaluate tracking health, consent adoption rates, bot traffic breakdowns, ad-blocker recovery metrics, and platform delivery diagnostics.

4. **Event and session inspection:**
   - Call `query_events` or `query_sessions` with `container_id` and filters to inspect raw event streams or customer sessions.
   - Call `list_events` or `list_sessions` when looking up a specific event or session by ID.

## Operational Rules

- Query dates must be specified in ISO 8601 format (YYYY-MM-DD).
- Read operations only inspect data for authorized containers connected to the account.
- For help or advanced configuration, consult https://www.tracklution.com/docs/tracklution-mcp/.
