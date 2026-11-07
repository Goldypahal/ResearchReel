import type { Metadata, Viewport } from "next";
import "./globals.css";

const geistSans = {
  variable: "font-sans",
};

const geistMono = {
  variable: "font-mono",
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const DESCRIPTION = "Share research, read papers with AI, and turn findings into short explainer reels.";

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
  themeColor: "#0b0b14",
};

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SocialProvider } from "@/context/SocialContext";
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
          <SocialProvider>
            <ThemeProvider>
              <NavigationWrapper>
                {children}
              </NavigationWrapper>
              <Toaster />
            </ThemeProvider>
          </SocialProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
