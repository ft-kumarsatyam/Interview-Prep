import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AppNotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Nothing here"
      action={
        <Button asChild>
          <Link href="/dashboard">
            <Home aria-hidden /> Back to today
          </Link>
        </Button>
      }
    >
      That page or item doesn&apos;t exist anymore. It may have been renamed or removed.
    </EmptyState>
  );
}
