export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-10 w-10' : 'h-6 w-6'
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-gray-300 border-t-brand-600`} />
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <strong>Error:</strong> {message}
    </div>
  )
}

export function SectionCard({
  title,
  children,
  badge,
}: {
  title: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {badge}
      </div>
      {children}
    </div>
  )
}
