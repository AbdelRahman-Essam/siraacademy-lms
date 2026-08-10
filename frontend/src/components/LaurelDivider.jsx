/**
 * A simplified laurel sprig, echoing the wreath in the Sira English seal.
 * Used as a quiet signature divider under hero headings and section
 * titles — the one recurring motif that ties every page back to the logo,
 * instead of a generic gradient rule.
 */
export default function LaurelDivider({ className = '' }) {
  return (
    <svg
      viewBox="0 0 160 20"
      className={`h-4 w-40 text-brass ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <line x1="10" y1="10" x2="150" y2="10" strokeWidth="0.75" opacity="0.5" />
      {[20, 35, 50, 65].map((x) => (
        <path key={`l-${x}`} d={`M${x} 10 Q ${x - 6} 3, ${x - 12} 8`} />
      ))}
      {[95, 110, 125, 140].map((x) => (
        <path key={`r-${x}`} d={`M${x} 10 Q ${x + 6} 3, ${x + 12} 8`} />
      ))}
      <circle cx="80" cy="10" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
