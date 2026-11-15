import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export interface Crumb { label: string; href?: string; }

export default function Header({ crumbs = [], rightSlot, className = "", showThemeToggle = true }: {
  crumbs?: Crumb[]; rightSlot?: React.ReactNode; className?: string; autoHide?: boolean; showThemeToggle?: boolean;
}) {
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className={`novel-header ${className}`}>
      <div className="novel-header-inner">
        <div className="novel-header-left">
          <Link href="/novel/" className="novel-brand" aria-label="Aleem’s Novels, library">
            <svg viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M16 8C11 3 5 4 2 4v24c5-1 10 0 14 4 4-4 9-5 14-4V4c-3 0-9-1-14 4Zm0 0v24" stroke="currentColor" strokeWidth="1.3"/><path d="M7 11c2 0 4 1 5 2m8 0c1-1 3-2 5-2M7 17c2 0 4 1 5 2m8 0c1-1 3-2 5-2" stroke="currentColor"/></svg>
            <span>Aleem’s Novels</span>
          </Link>
          {crumbs.length > 0 && <nav aria-label="Breadcrumb" className="novel-breadcrumb">{crumbs.map((c,i) => <span key={i} className="flex min-w-0 items-center gap-2"><span aria-hidden="true">/</span>{c.href ? <Link href={c.href}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</span>)}</nav>}
        </div>
        <nav aria-label="Main navigation" className="novel-header-links">
          <Link href="/novel/#collection">Browse</Link>
          <Link href="/" className="portfolio-link">Portfolio</Link>
          {rightSlot}{showThemeToggle && <ThemeToggle />}
        </nav>
      </div>
    </header>
  </>;
}
