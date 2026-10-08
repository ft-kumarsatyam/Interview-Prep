import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { startupImages } from "@/core/pwa/splash";
import "./globals.css";

/**
 * Bitdefender's browser extension stamps `bis_skin_checked` on every div before React hydrates, which React reports
 * as a hydration mismatch on every page. Strip those attributes before hydration and whenever the extension adds them.
 */
const STRIP_EXTENSION_ATTRIBUTES = `(function () {
  var names = ["bis_skin_checked", "bis_register"];
  var strip = function (el) { for (var i = 0; i < names.length; i++) if (el.hasAttribute(names[i])) el.removeAttribute(names[i]); };
  document.querySelectorAll("[bis_skin_checked],[bis_register]").forEach(strip);
  new MutationObserver(function (records) { for (var i = 0; i < records.length; i++) strip(records[i].target); })
    .observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: names });
})();`;

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "PrepOS", template: "%s · PrepOS" },
  description: "Private training cockpit for senior backend interviews.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "PrepOS", statusBarStyle: "black-translucent", startupImage: startupImages() },
  formatDetection: { telephone: false },
  // Marker the PrepOS Chrome extension looks for before it activates (extension/content-app.js).
  other: { "prepos-app": "1" },
};

export const viewport: Viewport = {
  // Lets the page draw under the notch; app chrome pads itself with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#13120f" },
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <ServiceWorkerRegister />
        <Script id="strip-extension-attributes" strategy="beforeInteractive">
          {STRIP_EXTENSION_ATTRIBUTES}
        </Script>
      </body>
    </html>
  );
}
