"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { addJobAction, captureProfileAction } from "@/app/(app)/jobs/actions";
import { captureAck, drainRequest, parseCapture } from "@/modules/jobs/domain/capture-bridge";

/**
 * Receives jobs and profile pages that the PrepOS extension captured and saves them, then tells the
 * extension to forget them. Mounted once in the app shell so a capture lands wherever you are. Renders nothing.
 */
export function CaptureListener() {
  const router = useRouter();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    async function handle(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const capture = parseCapture(event.data);
      if (!capture || seen.current.has(capture.id)) return;
      seen.current.add(capture.id);

      if (capture.kind === "job") {
        const res = await addJobAction(capture.data);
        if (!res.ok) return void toast.error(`Couldn't save the job: ${res.error}.`);
        window.postMessage(captureAck(capture.id), window.location.origin);
        toast.success(res.duplicate ? "You already track that job" : `Saved: ${capture.data.title}`, {
          description: capture.data.company,
          action: { label: "Open", onClick: () => router.push(`/jobs/${res.id}`) },
        });
      } else {
        const res = await captureProfileAction(capture.data);
        if (!res.ok) return void toast.error(`${res.error}.`);
        window.postMessage(captureAck(capture.id), window.location.origin);
        toast.success("Profile captured", { action: { label: "Audit it", onClick: () => router.push(`/resume?r=${res.id}`) } });
      }
    }
    const listener = (e: MessageEvent) => void handle(e);
    window.addEventListener("message", listener);
    // Anything sent while no PrepOS tab was open is waiting in the extension's queue.
    window.postMessage(drainRequest(), window.location.origin);
    return () => window.removeEventListener("message", listener);
  }, [router]);

  return null;
}
