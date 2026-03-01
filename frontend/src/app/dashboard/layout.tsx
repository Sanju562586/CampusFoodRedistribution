import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { ThemeProvider } from "@/components/theme-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        storageKey="theme-student"
      >
        <Sidebar />

        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </ThemeProvider>
    </div>
  );
}
