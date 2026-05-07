// Author: Angel Colman
'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownEditor } from '@/components/admin/MarkdownEditor'

export default function SettingsPage() {
  const [platformTerms, setPlatformTerms] = useState('')
  const [privacyPolicy, setPrivacyPolicy] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/admin/platform-settings')
      .then(r => r.json())
      .then(d => {
        setPlatformTerms(d.platformTerms ?? '')
        setPrivacyPolicy(d.privacyPolicy ?? '')
      })
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/platform-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platformTerms, privacyPolicy }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-800">Configuración de Plataforma</h1>
        <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          {saved ? '¡Guardado!' : 'Guardar'}
        </Button>
      </div>

      <Tabs defaultValue="terms">
        <TabsList>
          <TabsTrigger value="terms">Términos de Uso</TabsTrigger>
          <TabsTrigger value="privacy">Política de Privacidad</TabsTrigger>
        </TabsList>

        <TabsContent value="terms">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Estos términos se muestran globalmente a todos los participantes de la plataforma.
              </p>
              <MarkdownEditor value={platformTerms} onChange={setPlatformTerms} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Política de privacidad y tratamiento de datos personales.
              </p>
              <MarkdownEditor value={privacyPolicy} onChange={setPrivacyPolicy} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
