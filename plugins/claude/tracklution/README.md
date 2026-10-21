# Tracklution Claude Plugin

This plugin connects Claude to Tracklution server-side conversion tracking. It pairs with the Tracklution MCP server to install tracking scripts on your website and inspect analytics data through conversational interactions.

## Prerequisites

To use this plugin, you need a Tracklution account. Authentication uses OAuth 2.0 connecting directly to `https://mcp.tracklution.com/mcp`.

## Capabilities

The plugin supports two primary workflows:

- **Guided Installation:** Inspects your target site, creates or connects your tracking container, selects the best installation method for your framework, provides code snippets, and verifies event reception.
- **Analytics and Insights:** Answers questions about conversion performance, tracked events, user sessions, consent adherence, and ad-blocker recovery metrics.

## Data Privacy and Terms

Analytics tools only read data from containers that your connected account has permission to access. Installation steps create an account or change container settings, and scout fetches the target website to detect platform hints. Sensitive credentials such as webhook signing secrets and recovery keys remain redacted and protected.

- Documentation: https://www.tracklution.com/docs/tracklution-mcp/
- Privacy Policy: https://www.tracklution.com/policies/privacy-policy/
- Terms of Service: https://www.tracklution.com/policies/terms/
