export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>
}
