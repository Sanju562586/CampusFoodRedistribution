"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { LogOutIcon } from "lucide-react";
import { clearAuth } from "@/lib/auth";

export default function DashboardHeader() {
  const handleLogout = () => {
    clearAuth();
    window.location.href = "/login";
  };

  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="flex items-center gap-4">
        <ModeToggle />
        <Button 
          variant="outline" 
          size="sm"
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
          onClick={handleLogout}
        >
          <LogOutIcon className="mr-2 size-4 hidden sm:inline" />
          <span className="hidden sm:inline">Logout</span>
          <LogOutIcon className="size-4 sm:hidden" />
        </Button>

        <a href="/dashboard?tab=profile">
          <Avatar className="cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarFallback className="bg-purple-600 text-white font-bold">ST</AvatarFallback>
          </Avatar>
        </a>
      </div>
    </header>
  );
}
