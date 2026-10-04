import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./legal.css";
import "./ai-ads.css";
import "./mobile.css";
import "./meta-cards.css";
import "./mobile-interactions.css";
import "./mobile-product.css";
import "./ai-chat.css";
import "./mobile-motion.css";
import "./chat-refinement.css";
import "./mobile-menu.css";
import "./business-assets.css";
import "./meta-ai-experience.css";
import "./account-overview.css";
import "./app-icons.css";
import "./collection-filters.css";
import "./ai-results.css";
import { ApplicationShell } from "@/components/layout/ApplicationShell";
import { NavigationFeedback } from "@/components/layout/NavigationFeedback";
import { MobileExperience } from "@/components/layout/MobileExperience";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/components/ui/Toaster";
import { WebViewExternalLinks } from '@/components/layout/WebViewExternalLinks';

export const metadata: Metadata = {
  title: "Meta AI Ads",
  applicationName: "Meta AI Ads",
  appleWebApp: { capable: true, title: "Meta AI Ads" },
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
const themeScript = `(function(){try{var c={dark:'#242526',light:'#ffffff'};var t=localStorage.getItem('theme')||'system';var s=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;var r=t==='system'?(s?'dark':'light'):t;document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(r);var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',c[r]);}catch(e){document.documentElement.classList.remove('dark','light');document.documentElement.classList.add('light');}})();`;

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
        <NavigationFeedback />
        <ThemeProvider>
          <ToastProvider>
            <WebViewExternalLinks />
            <ApplicationShell>{children}</ApplicationShell>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
