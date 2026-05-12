/**
 * CC Commander canonical brand mark + lockup.
 * Source of truth: marketing/CC-Commander-from-ClaudeDesign/index.html
 * Mark glyph: terminal prompt — chevron + underline ("> _")
 *
 * Tokens used (Tailwind):
 *   accent:   #FF6B47  (--accent)
 *   bg:       #0F0F0F  (--bg)
 *   fg:       #F5F5F0  (--fg)
 */

type SizeProps = {
  size?: number;
  className?: string;
  ariaLabel?: string;
};

export function BrandMark({ size = 16, className, ariaLabel }: SizeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <path d="M3 4l4 4-4 4M8 12h5" />
    </svg>
  );
}

/**
 * Boxed favicon-style mark: rounded square bg + accent stroke glyph.
 * Use this when the mark needs to read at small sizes against any background.
 */
export function BrandMarkBoxed({ size = 32, className, ariaLabel }: SizeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
    >
      <rect width="32" height="32" rx="6" fill="#0F0F0F" />
      <path
        d="M9 11l5 5-5 5M16 22h8"
        stroke="#FF6B47"
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Full lockup: [> _]  commander / cc
 * Used in nav + footer. Mono wordmark, accent slash.
 */
export function BrandLockup({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={
        "inline-flex items-center gap-2 font-mono text-[15px] leading-none text-zinc-100 " +
        (className ?? "")
      }
      aria-label="CC Commander home"
    >
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#0F0F0F] text-[#FF6B47] ring-1 ring-white/5">
        <BrandMark size={size} />
      </span>
      <span className="font-semibold tracking-tight">commander</span>
      <span className="text-[#FF6B47]">/</span>
      <span className="text-zinc-400">cc</span>
    </span>
  );
}
