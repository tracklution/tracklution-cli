# Tracklution + Next.js (App Router)

This example shows what a Next.js (App Router) project looks like after
Tracklution is installed.

> **Note**: the tracking snippet below uses `<TRACKLUTION_TAG_ID>` as a
> placeholder. The actual snippet is generated per-account by the Tracklution
> MCP server's `get_installation_scripts` tool — do not copy this file
> verbatim into a real project, ask an AI agent to install Tracklution and it
> will paste the right snippet for your container.

## What the agent writes

Two files end up in your project:

1. `.cursor/mcp.json` (or equivalent for your agent client) — points Cursor /
   Claude Code / etc. at the Tracklution MCP. See [`.cursor/mcp.json`](.cursor/mcp.json).
2. `app/layout.tsx` (or `pages/_app.tsx` for the Pages router) — loads the
   first-party pixel script. See [`app/layout.tsx`](app/layout.tsx).

## Custom events

Once the pixel script is loaded, you can fire events from any client component:

```tsx
'use client';

export function CheckoutButton({ order }: { order: { id: string; total: number } }) {
  return (
    <button
      onClick={() => {
        // Tracklution exposes a global `trl` function once the pixel loads.
        window.trl?.('event', 'Purchase', {
          value: order.total,
          currency: 'EUR',
          order_id: order.id,
        });
      }}
    >
      Complete order
    </button>
  );
}
```

`window.trl` is the first-party pixel API. The standard event names (`Purchase`,
`Lead`, `ViewContent`, `AddToCart`, `InitiateCheckout`, ...) live at
[install-recipes.json](https://www.tracklution.com/api/install-recipes/) under
`standard_events`.

## Server-side events

For the most reliable conversion data — especially `Purchase` events that
happen after the user has left the site — send events server-side via the
webhook URL the MCP gives you. Example handler in a Next.js Route Handler:

```ts
// app/api/track/route.ts
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const event = await req.json();

  await fetch('<YOUR_TRACKLUTION_WEBHOOK_URL>', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: 'Purchase',
      ...event,
    }),
  });

  return Response.json({ ok: true });
}
```

The exact webhook URL (including your container's tracking key) comes from the
MCP's `get_installation_scripts` response.

## Requirements

- Next.js 14 or newer (App Router; Pages Router works too with `pages/_app.tsx`).
- An AI agent client (Cursor recommended) or manual MCP setup.
