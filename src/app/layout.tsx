import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./ai-ads.css";
import "./mobile.css";
import "./meta-cards.css";
import "./mobile-interactions.css";
import { MobileExperience } from "@/components/layout/MobileExperience";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/ui/Toaster";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { NavSpacer } from "@/components/layout/NavSpacer";
import { AuthNotifier } from "@/components/layout/AuthNotifier";
import { WorkspaceBar } from "@/components/layout/WorkspaceBar";
import { FloatingAssistant } from "@/components/ai/FloatingAssistant";
import { WorkspaceNavigator } from "@/components/layout/WorkspaceNavigator";

export const metadata: Metadata = {
  title: "Meta Ads AI",
  applicationName: "Meta Ads AI",
  appleWebApp: { capable: true, title: "Meta Ads AI" },
  description: "A modern workspace for Meta ads, pages, content, and AI analysis.",
  icons: {
    icon: "/meta-ads-ai.png",
    apple: "/meta-ads-ai.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before React hydration to prevent flash of wrong theme.
// Also sets theme-color meta so the iOS safe area matches immediately.
const themeScript = `(function(){try{var c={dark:'#102334',light:'#ffffff'};var t=localStorage.getItem('theme')||'system';var s=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(s?'dark':'light'):t;document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(r);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c[r]);}catch(e){document.documentElement.classList.remove('dark','light');document.documentElement.classList.add('light');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="app-shell flex flex-col min-h-screen">
        <MobileExperience />
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AuthNotifier />
              <Header />
              <NavSpacer><WorkspaceBar />{children}</NavSpacer>
              <BottomNav />
              <FloatingAssistant />
              <WorkspaceNavigator />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
