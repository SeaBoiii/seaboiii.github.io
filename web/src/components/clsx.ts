// Tiny classnames helper — avoids dependency.
export default function clsx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}
