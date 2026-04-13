export default function SearchLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="h-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_32%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted))/0.45)]">
      <div className="h-full p-4 sm:p-5">{children}</div>
    </main>
  )
}
