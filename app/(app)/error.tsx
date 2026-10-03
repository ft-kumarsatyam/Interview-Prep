"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-14 text-center sm:py-16">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </div>
      <h2 className="font-medium">This page didn&apos;t load</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Usually a dropped connection or the database waking up. Your progress is saved, so try again in a moment.
      </p>
      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="mt-4 max-w-full overflow-x-auto rounded-lg bg-muted px-3 py-2 text-left font-mono text-xs text-muted-foreground">{error.message}</pre>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button loading={pending} onClick={() => startTransition(() => retry())}>
          {!pending && <RotateCcw aria-hidden />} {pending ? "Retrying…" : "Try again"}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <Home aria-hidden /> Dashboard
          </Link>
        </Button>
      </div>
      {error.digest && <p className="mt-4 font-mono text-2xs text-muted-foreground">Ref {error.digest}</p>}
    </div>
  );
}
