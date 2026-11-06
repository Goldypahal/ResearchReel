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
  description: "Share research as posts, papers and short reels. Discuss, collaborate and learn with researchers worldwide.",
  applicationName: "ResearchReel",
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
