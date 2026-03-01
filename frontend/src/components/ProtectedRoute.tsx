"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, clearAuth } from "@/lib/auth";
import api from "@/lib/axios";

type Props = {
  children: React.ReactNode;
  allowedRole: "student" | "admin" | "donor";
};

export default function ProtectedRoute({ children, allowedRole }: Props) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const startVerification = async () => {
      const auth = getAuth();

      // 1. Local Check
      if (!auth) {
        router.replace("/login");
        return;
      }

      if (auth.role !== allowedRole) {
        // Redirect based on role if mismatched
        if (auth.role === "admin") router.replace("/admin");
        else if (auth.role === "donor") router.replace("/donor");
        else router.replace("/dashboard");
        return;
      }

      // 2. Server Check (Validate Token & User Existence)
      try {
        await api.get('/auth/user/me');
        // Success - user exists and token is valid
        setIsVerifying(false);
      } catch (err) {
        // 401: Invalid Token, 404: User Deleted
        console.error("Session invalid:", err);
        clearAuth();
        router.replace("/login");
      }
    };

    startVerification();
  }, [allowedRole, router]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/90">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
