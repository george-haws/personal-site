import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Brand } from "@/components/Brand";
import { Nav } from "@/components/Nav";
import { SocialLinks } from "@/components/SocialLinks";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { site } from "@/data/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", mono.variable)} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6">
            <header className="flex items-center justify-between border-b border-border py-4">
              <nav aria-label="Main" className="flex flex-1 items-center justify-between text-sm">
                <Brand />
                <Nav />
              </nav>
              <div className="ml-4">
                <ThemeToggle />
              </div>
            </header>
            <main className="flex-1 py-10">{children}</main>
            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-6 text-sm text-muted-foreground">
              <small>
                © {new Date().getFullYear()} {site.name}
              </small>
              <SocialLinks links={site.links} />
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
