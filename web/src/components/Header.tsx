import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export interface Crumb {
  label: string;
  href?: string;
}

export default function Header({
  crumbs = [],
  rightSlot,
  className = "",
  autoHide = false,
}: {
  crumbs?: Crumb[];
  rightSlot?: React.ReactNode;
  className?: string;
  autoHide?: boolean;
}) {
  return (
    <header
      data-autohide={autoHide ? "true" : "false"}
      className={
        "sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur " +
        (autoHide ? "header-autohide " : "") +
        className
      }
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/novel"
            className="font-display text-lg font-semibold tracking-tight text-text hover:text-accent-strong"
          >
            Aleem&apos;s Novels
          </Link>
          {crumbs.length > 0 && (
            <nav
              aria-label="Breadcrumb"
              className="hidden min-w-0 items-center gap-1.5 text-sm text-muted sm:flex"
            >
              {crumbs.map((c, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                  <span className="text-border">/</span>
                  {c.href ? (
                    <Link
                      href={c.href}
                      className="truncate hover:text-text"
                      title={c.label}
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate text-text" title={c.label}>
                      {c.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
