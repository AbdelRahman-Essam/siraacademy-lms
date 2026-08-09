export default function Logo({ size = 40, showName = true }) {
  return (
    <div className="flex items-center gap-2">
      <img src="/logo.png" alt="Sira English" style={{ width: size, height: size }} className="object-contain" />
      {showName && (
        <span className="font-serif text-brand text-lg tracking-wide">Sira English</span>
      )}
    </div>
  )
}
