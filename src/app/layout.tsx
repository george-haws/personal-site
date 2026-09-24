import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import { SocialLinks } from "@/components/SocialLinks";
import { site } from "@/data/site";
import "@picocss/pico/css/pico.classless.min.css";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header>
          <nav aria-label="Site">
            <ul>
              <li>
                <Link href="/">
                  <strong>{site.name}</strong>
                </Link>
              </li>
            </ul>
          </nav>
          <Nav />
        </header>
        <main>{children}</main>
        <footer>
          <small>
            © {new Date().getFullYear()} {site.name}
          </small>
          <SocialLinks links={site.links} />
        </footer>
      </body>
    </html>
  );
}
