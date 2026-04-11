"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, CalendarCheck, BarChart2, User } from "lucide-react";

const navItems = [
  { label: "Browse", icon: LayoutGrid, href: "/dashboard" },
  { label: "Reservations", icon: CalendarCheck, href: "/dashboard/reservations" },
  { label: "Leaderboard", icon: BarChart2, href: "/dashboard/leaderboard" },
  { label: "Profile", icon: User, href: "/dashboard?tab=profile" },
];

export default function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map(({ label, icon: Icon, href }) => {
          const isActive =
            label === "Browse"
              ? pathname === "/dashboard"
              : pathname.startsWith(href.split("?")[0]) && href !== "/dashboard";

          return (
            <Link
              key={label}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 transition-colors ${
                isActive ? "text-[#1a5c2e]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : "stroke-[1.8px]"}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                isActive ? "text-[#1a5c2e]" : "text-gray-400"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
