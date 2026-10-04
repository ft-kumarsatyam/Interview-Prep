import { Loader2 } from "lucide-react";
import { cn } from "@/core/utils";

/** Indeterminate spinner. Pass `aria-hidden` when a nearby label already says what is loading. */
export function Spinner({ className, label = "Loading", ...props }: React.ComponentProps<"svg"> & { label?: string }) {
  return (
    <Loader2
      role="status"
      aria-label={props["aria-hidden"] ? undefined : label}
      className={cn("size-4 animate-spin motion-reduce:animate-none", className)}
      {...props}
    />
  );
}
