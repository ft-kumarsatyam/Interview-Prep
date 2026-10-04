import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/layout/sw-register";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { startupImages } from "@/core/pwa/splash";
import "./globals.css";

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
    { media: "(prefers-color-scheme: dark)", color: "#0b0d12" },
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="min-h-full" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster richColors position="top-center" />
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
