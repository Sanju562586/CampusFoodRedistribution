"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function PublicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "placeholder-client-id.apps.googleusercontent.com";

    return (
        <GoogleOAuthProvider
            clientId={googleClientId}
        >

            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                storageKey="theme-public"
            >
                {children}
            </ThemeProvider>
        </GoogleOAuthProvider>
    );
}
