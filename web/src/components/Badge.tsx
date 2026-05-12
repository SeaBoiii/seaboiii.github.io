import clsx from "./clsx";

export type BadgeVariant = "neutral" | "ok" | "wip" | "accent";

const variantClass: Record<BadgeVariant, string> = {
  neutral: "bg-surface-2 text-muted border-border",
  ok: "bg-accent-soft text-accent-strong border-accent/30",
  wip: "bg-surface-2 text-text border-border",
  accent: "bg-accent text-white border-accent",
};

export default function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variantClass[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isComplete = /complete/i.test(status);
  return <Badge variant={isComplete ? "ok" : "wip"}>{status}</Badge>;
}
