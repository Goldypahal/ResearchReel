import type { Metadata, Viewport } from "next";
import "./globals.css";

const geistSans = {
  variable: "font-sans",
};

const geistMono = {
  variable: "font-mono",
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
const DESCRIPTION = "Share research as posts, papers and short reels. Discuss, collaborate and learn with researchers worldwide.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "ResearchReel", template: "%s · ResearchReel" },
  description: DESCRIPTION,
  applicationName: "ResearchReel",
  openGraph: { type: "website", siteName: "ResearchReel", title: "ResearchReel", description: DESCRIPTION, url: "/", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "ResearchReel", description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RealtimeProvider } from "@/context/RealtimeContext";
import NavigationWrapper from "@/components/navigation/NavigationWrapper";
import { Toaster } from "@/components/ui/Toast";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)] overflow-x-hidden`}
      >
        <AuthProvider>
          <RealtimeProvider>
            <ThemeProvider>
              <NavigationWrapper>
                {children}
              </NavigationWrapper>
              <Toaster />
            </ThemeProvider>
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
