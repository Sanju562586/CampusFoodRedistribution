"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function DashboardHeader() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold">Dashboard</h1>

      <div className="flex items-center gap-4">
        <ModeToggle />
        <Button variant="outline" size="sm">
          Logout
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
