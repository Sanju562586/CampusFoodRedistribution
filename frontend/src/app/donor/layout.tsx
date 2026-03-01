import { ThemeProvider } from "@/components/theme-provider";

export default function DonorLayout({
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
            storageKey="theme-donor"
        >
            {children}
        </ThemeProvider>
    );
}
