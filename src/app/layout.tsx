import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'OccasioCart',
  description: 'AI-powered occasion-based grocery shopping agent',
};

// TODO: add providers (theme, chat context, etc.) as the UI is built out.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
