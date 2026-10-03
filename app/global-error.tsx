"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="grid min-h-dvh place-items-center bg-background p-6 font-sans text-foreground antialiased">
        <title>Something went wrong · PrepOS</title>
        <div role="alert" className="max-w-md text-center">
          <h1 className="text-lg font-semibold">PrepOS hit a snag</h1>
          <p className="mt-2 text-sm text-muted-foreground">The app couldn&apos;t start. Your data is safe. Try again, and if it keeps happening, check the server logs.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Try again
          </button>
          {error.digest && <p className="mt-4 font-mono text-2xs text-muted-foreground">Ref {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
