import "./globals.css";
import { Toaster } from "sonner";

export const metadata = {
  title: "Campus Food Network",
  description: "Reduce food waste. Feed the campus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
