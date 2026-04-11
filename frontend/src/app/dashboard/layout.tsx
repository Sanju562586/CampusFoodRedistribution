"use client";

import { ThemeProvider } from "@/components/theme-provider";
import StudentSidebar from "@/components/StudentSidebar";
import StudentBottomNav from "@/components/StudentBottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="theme-student"
    >
      <div className="min-h-screen bg-[#eef8ee]">
        {/* Desktop sidebar — fixed, 224px wide */}
        <StudentSidebar />

        {/* Main content — offset by sidebar width on lg+ */}
        <div className="lg:pl-56 min-h-screen pb-20 lg:pb-0">
          {children}
        </div>

        {/* Mobile bottom nav — hidden on desktop */}
        <StudentBottomNav />
      </div>
    </ThemeProvider>
  );
}
