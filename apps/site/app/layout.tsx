import type { Metadata } from "next";
import Link from "next/link";
import { ScanSearch } from "lucide-react";
import { SiGithub } from "react-icons/si";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cmslab.afaqrashid.com"),
  title: {
    default: "cms-lab | Catch CMS bugs before deploy",
    template: "%s | cms-lab",
  },
  description:
    "cms-lab is a CLI that scans headless CMS content against Next.js routes before deploy.",
  icons: {
    icon: [{ url: "/assets/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/assets/icon.svg", sizes: "any" }],
  },
  openGraph: {
    title: "cms-lab",
    description: "Catch CMS bugs before deploy.",
    images: [{ url: "/assets/report-preview.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="page">
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}

function SiteHeader() {
  return (
    <header className="topbar">
      <div className="wrap topbarInner">
        <Link className="brand" href="/" aria-label="cms-lab home">
          <ScanSearch
            aria-hidden="true"
            className="brandMark"
            focusable="false"
            strokeWidth={1.9}
          />
          <span className="brandName">cms-lab</span>
        </Link>
        <nav className="topnav" aria-label="Primary">
          <Link href="/docs">Docs</Link>
          <Link href="/docs/scan">Scan</Link>
        </nav>
        <div className="topRight">
          <a
            aria-label="GitHub repository"
            className="iconLink"
            href="https://github.com/i-afaqrashid/cms-lab"
            rel="noreferrer"
            target="_blank"
          >
            <SiGithub aria-hidden="true" focusable="false" />
          </a>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap footerInner">
        <div className="footerCopy">
          <strong>Catch CMS bugs before deploy.</strong>
          <span>Free, open source, and local to your project.</span>
        </div>
        <span className="footerLinks">
          <Link href="/docs">Docs</Link>
          <Link href="/docs/scan">Scan</Link>
          <a href="https://www.npmjs.com/package/cms-lab">npm</a>
        </span>
      </div>
    </footer>
  );
}
