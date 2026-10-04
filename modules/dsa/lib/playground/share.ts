/** Link that opens code in the Playground (`?snippet=` takes base64url). */
export function playgroundHref(code: string): string {
  const bytes = new TextEncoder().encode(code);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  const b64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `/playground?snippet=${b64}`;
}
