"use client";

import { ThemeProvider } from "@/components/theme-provider";
import StudentSidebar from "@/components/StudentSidebar";
import StudentBottomNav from "@/components/StudentBottomNav";
import { Suspense } from "react";

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
      <div className="min-h-screen bg-[#eef8ee] dark:bg-transparent">
        {/* Desktop sidebar — fixed, 224px wide */}
        <Suspense fallback={<div className="hidden lg:flex w-56 h-screen border-r border-white/10" />}>
          <StudentSidebar />
        </Suspense>

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
