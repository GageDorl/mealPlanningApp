import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Bento - Meal Planning App</title>
        <meta name="google-site-verification" content="crS2o6_XLZpBKsQr7j_JeUP1pYpBM6Cz5zylyDitFzE" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
