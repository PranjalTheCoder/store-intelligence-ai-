import { type ReactNode } from 'react'
import clsx from 'clsx'

interface MetricCardProps {
  label:     string
  value:     string | number
  sub?:      string
  icon?:     ReactNode
  trend?:    'up' | 'down' | 'neutral'
  loading?:  boolean
  color?:    string // tailwind bg class
}

export function MetricCard({ label, value, sub, icon, trend, loading, color = 'bg-white' }: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
        <div className="h-8 w-16 rounded bg-gray-300" />
      </div>
    )
  }

  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-500' : 'text-gray-500'

  return (
    <div className={clsx('rounded-xl border border-gray-200 p-5 flex flex-col gap-2', color)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className={clsx('text-xs', trendColor)}>{sub}</div>}
    </div>
  )
}
