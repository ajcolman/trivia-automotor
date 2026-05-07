// Author: Angel Colman
'use client'

import { useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { useRouter } from 'next/navigation'

interface TriviaToggleProps {
  id: string
  isActive: boolean
}

export function TriviaToggle({ id, isActive }: TriviaToggleProps) {
  const [active, setActive] = useState(isActive)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/trivias/${id}/toggle`, { method: 'PATCH' })
    if (res.ok) {
      const data = await res.json()
      setActive(data.isActive)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Switch
      checked={active}
      onCheckedChange={toggle}
      disabled={loading}
      className="data-[state=checked]:bg-blue-600"
    />
  )
}
