/**
 * Render the PWA icons from the flame mark in app/icon.svg.
 * Usage: npm run icons  (writes public/icon-*.png and app/apple-icon.png)
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const BRAND = "#7c5cff";
const FLAME = "M16 6c1 3.5 5.5 6 5.5 11.2A5.5 5.5 0 0 1 16 23a5.5 5.5 0 0 1-5.5-5.8c0-2.2 1-3.9 2.2-5 .2 1.8 1 3 2.3 3.6-.3-3.6.2-6.8 1-9.8Z";

/** `rounded` matches the favicon; maskable icons need a full-bleed square with the mark inside the 80% safe zone. */
function svg({ rounded, scale }: { rounded: boolean; scale: number }): Buffer {
  const offset = 16 - 16 * scale;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
      `<rect width="32" height="32" ${rounded ? 'rx="8"' : ""} fill="${BRAND}"/>` +
      `<path d="${FLAME}" fill="#fff" transform="translate(${offset} ${offset}) scale(${scale})"/>` +
      `</svg>`,
  );
}

async function png(source: Buffer, size: number, out: string) {
  await writeFile(out, await sharp(source, { density: 1200 }).resize(size, size).png().toBuffer());
  console.log(`wrote ${out}`);
}

async function main() {
  await png(svg({ rounded: true, scale: 1 }), 192, "public/icon-192.png");
  await png(svg({ rounded: true, scale: 1 }), 512, "public/icon-512.png");
  await png(svg({ rounded: false, scale: 0.8 }), 512, "public/icon-maskable-512.png");
  await png(svg({ rounded: false, scale: 0.85 }), 180, "app/apple-icon.png");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
