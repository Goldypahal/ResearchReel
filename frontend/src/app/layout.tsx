import type { Metadata, Viewport } from "next";
import "./globals.css";

const geistSans = {
  variable: "font-sans",
};

const geistMono = {
  variable: "font-mono",
};

export const metadata: Metadata = {
  title: { default: "ResearchReel", template: "%s · ResearchReel" },
  description: "Share research, read papers with AI, and turn findings into short explainer reels.",
  applicationName: "ResearchReel",
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
