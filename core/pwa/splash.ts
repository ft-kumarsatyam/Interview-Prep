/**
 * iOS ignores the manifest's splash settings; it wants one `apple-touch-startup-image`
 * per exact screen size. Shared by scripts/generate-icons.ts and app/layout.tsx.
 */
export interface SplashDevice {
  /** CSS points, portrait. */
  width: number;
  height: number;
  ratio: 2 | 3;
}

export const SPLASH_DEVICES: readonly SplashDevice[] = [
  { width: 440, height: 956, ratio: 3 }, // 16 Pro Max
  { width: 402, height: 874, ratio: 3 }, // 16 Pro
  { width: 430, height: 932, ratio: 3 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { width: 393, height: 852, ratio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 428, height: 926, ratio: 3 }, // 12/13 Pro Max, 14 Plus
  { width: 390, height: 844, ratio: 3 }, // 12, 13, 14
  { width: 375, height: 812, ratio: 3 }, // X, XS, 11 Pro, 12/13 mini
  { width: 414, height: 896, ratio: 3 }, // XS Max, 11 Pro Max
  { width: 414, height: 896, ratio: 2 }, // XR, 11
  { width: 375, height: 667, ratio: 2 }, // 8, SE (2nd/3rd gen)
];

export const SPLASH_THEMES = {
  dark: { background: "#13120f", text: "#ece9e2" },
  light: { background: "#f6f4ef", text: "#1c1a17" },
} as const;

export type SplashTheme = keyof typeof SPLASH_THEMES;

export function splashFile(d: SplashDevice, theme: SplashTheme): string {
  return `/splash/${theme}-${d.width * d.ratio}x${d.height * d.ratio}.png`;
}

export function splashMedia(d: SplashDevice, theme: SplashTheme): string {
  return (
    `(device-width: ${d.width}px) and (device-height: ${d.height}px) and ` +
    `(-webkit-device-pixel-ratio: ${d.ratio}) and (orientation: portrait) and (prefers-color-scheme: ${theme})`
  );
}

export function startupImages(): { url: string; media: string }[] {
  return SPLASH_DEVICES.flatMap((d) =>
    (Object.keys(SPLASH_THEMES) as SplashTheme[]).map((t) => ({ url: splashFile(d, t), media: splashMedia(d, t) })),
  );
}
