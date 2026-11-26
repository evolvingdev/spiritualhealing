'use client';

/**
 * Last-resort error page, used only when the root layout itself fails, so translations may be
 * unavailable. Bilingual and dependency-free on purpose.
 */
export default function GlobalError({ reset }: { readonly reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
        <h1>Something went wrong</h1>
        <p lang="hi-IN">कुछ गड़बड़ हो गई</p>
        <button type="button" onClick={reset} style={{ minHeight: '44px', padding: '0 1rem' }}>
          Try again · फिर से प्रयास करें
        </button>
      </body>
    </html>
  );
}
