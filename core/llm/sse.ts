/**
 * Server-sent-events parsing for streamed LLM replies. Pure apart from reading the stream. Yields the `data:` payload
 * of each event (events are separated by a blank line; a payload may span several `data:` lines). A trailing event
 * without the final blank line is still delivered.
 */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = nextBoundary(buffer)) !== -1) {
        const event = buffer.slice(0, idx);
        buffer = buffer.slice(idx).replace(/^(\r?\n){1,2}/, "");
        const data = dataOf(event);
        if (data !== null) yield data;
      }
    }
    buffer += decoder.decode();
    const tail = dataOf(buffer);
    if (tail !== null) yield tail;
  } finally {
    reader.releaseLock();
  }
}

function nextBoundary(s: string): number {
  const a = s.indexOf("\n\n");
  const b = s.indexOf("\r\n\r\n");
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

function dataOf(event: string): string | null {
  const lines = event
    .split(/\r?\n/)
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).replace(/^ /, ""));
  return lines.length ? lines.join("\n") : null;
}
