import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-lg place-items-center p-6">
      <EmptyState
        icon={Compass}
        title="Page not found"
        action={
          <Button asChild>
            <Link href="/dashboard">
              <Home aria-hidden /> Go to dashboard
            </Link>
          </Button>
        }
      >
        Check the address, or jump back to today&apos;s plan.
      </EmptyState>
    </main>
  );
}
