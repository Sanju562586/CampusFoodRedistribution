import { ThemeProvider } from "@/components/theme-provider";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="theme-admin"
        >
            {children}
        </ThemeProvider>
    );
}
