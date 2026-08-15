import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import AppAtmosphere from "@/components/AppAtmosphere";
import PageTransition from "@/components/PageTransition";

export const metadata: Metadata = {
  title: "Campus Food Network",
  description: "Reduce food waste. Feed the campus.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground font-body app-shell">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AppAtmosphere />
          <PageTransition>{children}</PageTransition>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
