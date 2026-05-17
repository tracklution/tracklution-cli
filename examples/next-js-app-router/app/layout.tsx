// PLACEHOLDER — DO NOT COPY VERBATIM
//
// AGENT: when the user asks you to install Tracklution, replace this entire
// file with the snippet returned by the MCP's `get_installation_scripts` tool
// (called with framework: "nextjs"). The placeholder `<TRACKLUTION_TAG_ID>`
// below is intentional; the real tag ID is per-account and ships from the MCP.

import Script from 'next/script';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Your site',
  description: 'Tracklution-tracked Next.js app',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* AGENT: replace src with the URL from get_installation_scripts.framework_snippets.nextjs.init */}
        <Script
          id="tracklution-pixel"
          src="https://<TRACKLUTION_TAG_ID>.tracklution.com/t.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
