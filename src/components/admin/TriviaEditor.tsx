// Author: Angel Colman
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Save, ArrowLeft, Loader2, ExternalLink, Plus, Trash2, GripVertical, X } from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { UploadDropzone } from './UploadDropzone'
import { QuestionImporter } from './QuestionImporter'
import { MarkdownEditor } from './MarkdownEditor'
import Link from 'next/link'
import { slugify } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface TriviaEditorProps {
  trivia: any | null
  companies: { id: string; name: string }[]
  brands: { id: string; name: string; companyId: string; models: string[] }[]
  mode: 'create' | 'edit'
}

interface QuestionForm {
  question: string
  optionA: string; optionB: string; optionC: string; optionD: string
  correctAnswer: number
  points: number
  timeLimit: number
}

export function TriviaEditor({ trivia, companies, brands, mode }: TriviaEditorProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(trivia?.id ?? null)
  const [tab, setTab] = useState('general')
  const [questions, setQuestions] = useState<any[]>(trivia?.questions ?? [])
  const [formFields, setFormFields] = useState<any[]>(trivia?.formFields ?? [])
  const [prizes, setPrizes] = useState<any[]>(trivia?.prizes ?? [])
  const [importOpen, setImportOpen] = useState(false)
  const [qDialogOpen, setQDialogOpen] = useState(false)
  const [editingQ, setEditingQ] = useState<any | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>(trivia?.logoUrl ?? '')
  const [colors, setColors] = useState({
    primaryColor: trivia?.primaryColor ?? '#003087',
    secondaryColor: trivia?.secondaryColor ?? '#002060',
    accentColor: trivia?.accentColor ?? '#FFD700',
    backgroundColor: trivia?.backgroundColor ?? '#F8FAFC',
    textColor: trivia?.textColor ?? '#1A1A2E',
  })

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: trivia?.title ?? '',
      description: trivia?.description ?? '',
      slug: trivia?.slug ?? '',
      companyId: trivia?.companyId ?? '',
      brandId: trivia?.brandId ?? '',
      isActive: trivia?.isActive ?? true,
      isPublic: trivia?.isPublic ?? true,
      maxPlaysPerUser: trivia?.maxPlaysPerUser ?? 1,
      startDate: trivia?.startDate ? new Date(trivia.startDate).toISOString().slice(0, 16) : '',
      endDate: trivia?.endDate ? new Date(trivia.endDate).toISOString().slice(0, 16) : '',
      gameInstructions: trivia?.gameInstructions ?? '',
      termsAndConditions: trivia?.termsAndConditions ?? '',
    },
  })

  const title = watch('title')
  const companyId = watch('companyId')

  // Auto-generate slug from title
  useEffect(() => {
    if (mode === 'create' && title) {
      setValue('slug', slugify(title))
    }
  }, [title, mode, setValue])

  const filteredBrands = brands.filter(b => !companyId || b.companyId === companyId)

  const onSave = handleSubmit(async (data) => {
    setSaving(true)
    try {
      const body = {
        ...data,
        ...colors,
        logoUrl: logoUrl || null,
        startDate: data.startDate ? new Date(data.startDate).toISOString() : null,
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        maxPlaysPerUser: Number(data.maxPlaysPerUser),
        companyId: data.companyId || null,
        brandId: data.brandId || null,
      }

      const url = mode === 'create' ? '/api/admin/trivias' : `/api/admin/trivias/${savedId}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await res.json()

      if (res.ok) {
        if (mode === 'create') {
          setSavedId(result.id)
          router.push(`/admin/trivias/${result.id}`)
        } else {
          alert('¡Trivia guardada correctamente!')
        }
      } else {
        alert(result.error ?? 'Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  })

  const saveQuestion = async (qData: QuestionForm) => {
    if (!savedId) { alert('Guarda la trivia primero'); return }
    const options = [qData.optionA, qData.optionB, qData.optionC, qData.optionD].filter(Boolean)
    const body = {
      triviaId: savedId,
      question: qData.question,
      options,
      correctAnswer: Number(qData.correctAnswer),
      points: Number(qData.points),
      timeLimit: Number(qData.timeLimit),
    }

    if (editingQ?.id) {
      const res = await fetch(`/api/admin/questions/${editingQ.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const updated = await res.json()
      setQuestions(qs => qs.map(q => q.id === editingQ.id ? updated : q))
    } else {
      const res = await fetch('/api/admin/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const created = await res.json()
      setQuestions(qs => [...qs, created])
    }
    setQDialogOpen(false)
    setEditingQ(null)
  }

  const deleteQuestion = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta?')) return
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
    setQuestions(qs => qs.filter(q => q.id !== id))
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/trivias">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Volver</Button>
          </Link>
          <h1 className="text-xl font-black text-slate-800">
            {mode === 'create' ? 'Nueva Trivia' : 'Editar Trivia'}
          </h1>
        </div>
        <div className="flex gap-2">
          {savedId && (
            <Link href={`/play/${watch('slug')}`} target="_blank">
              <Button variant="outline" size="sm" className="text-xs">
                <ExternalLink className="w-3 h-3 mr-1" /> Ver trivia
              </Button>
            </Link>
          )}
          <Button onClick={onSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Guardando...</> : <><Save className="w-4 h-4 mr-2" />Guardar</>}
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="design">Diseño</TabsTrigger>
          <TabsTrigger value="questions">Preguntas {questions.length > 0 && `(${questions.length})`}</TabsTrigger>
          <TabsTrigger value="form">Formulario</TabsTrigger>
          <TabsTrigger value="terms">Términos</TabsTrigger>
        </TabsList>

        {/* ── General ── */}
        <TabsContent value="general">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Título *</Label>
                  <Input {...register('title', { required: true })} placeholder="Copa Mundial 2026" className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <Textarea {...register('description')} placeholder="Descripción opcional..." rows={2} className="mt-1" />
                </div>
                <div>
                  <Label>Slug (URL) *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input {...register('slug', { required: true })} placeholder="copa-mundial-2026" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setValue('slug', slugify(watch('title')))}>↻</Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">/play/<strong>{watch('slug') || 'slug'}</strong></p>
                </div>
                <div>
                  <Label>Máx. participaciones</Label>
                  <Input type="number" min={1} max={100} {...register('maxPlaysPerUser')} className="mt-1" />
                  <p className="text-xs text-slate-400 mt-1">Por participante</p>
                </div>
                <div>
                  <Label>Empresa</Label>
                  <select {...register('companyId')} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-white">
                    <option value="">Sin empresa</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Marca</Label>
                  <select {...register('brandId')} className="w-full mt-1 px-3 py-2 border rounded-xl text-sm bg-white">
                    <option value="">Sin marca</option>
                    {filteredBrands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Fecha inicio</Label>
                  <Input type="datetime-local" {...register('startDate')} className="mt-1" />
                </div>
                <div>
                  <Label>Fecha fin</Label>
                  <Input type="datetime-local" {...register('endDate')} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label>Instrucciones de juego</Label>
                  <Textarea {...register('gameInstructions')} placeholder="Instrucciones personalizadas para los participantes..." rows={3} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch {...register('isActive')} defaultChecked={trivia?.isActive ?? true} onCheckedChange={v => setValue('isActive', v)} />
                  <Label>Trivia activa</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch {...register('isPublic')} defaultChecked={trivia?.isPublic ?? true} onCheckedChange={v => setValue('isPublic', v)} />
                  <Label>Visible en landing page</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Design ── */}
        <TabsContent value="design">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <div>
                <Label className="text-sm font-bold">Logo de la trivia</Label>
                <div className="mt-2 max-w-sm">
                  <UploadDropzone value={logoUrl} onUpload={setLogoUrl} label="Subir logo (PNG, JPG, SVG)" />
                </div>
              </div>
              <div>
                <Label className="text-sm font-bold">Paleta de colores</Label>
                <div className="mt-3">
                  <ColorPicker value={colors} onChange={setColors} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Questions ── */}
        <TabsContent value="questions">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-700">{questions.length} preguntas</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                    ↑ Importar
                  </Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => { setEditingQ(null); setQDialogOpen(true) }}>
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </Button>
                </div>
              </div>

              {!savedId && (
                <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3 mb-4">
                  ⚠️ Guarda la trivia primero para poder agregar preguntas.
                </p>
              )}

              {questions.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay preguntas aún.</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                      <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{q.question}</p>
                        <p className="text-xs text-green-600">✓ {(q.options as string[])[q.correctAnswer]}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
                        <span>{q.points}pts</span>
                        <span>{q.timeLimit}s</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingQ(q); setQDialogOpen(true) }}>✎</Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Form ── */}
        <TabsContent value="form">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm text-slate-500 mb-4">
                Define qué datos recopilar de los participantes al finalizar la trivia.
              </p>
              <div className="space-y-2">
                {formFields.map((f, i) => (
                  <div key={f.id ?? i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                    <span className="text-xs font-mono text-slate-400 w-20 truncate">{f.fieldName}</span>
                    <span className="flex-1 text-sm font-medium">{f.fieldLabel}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{f.fieldType}</span>
                    {f.isRequired && <span className="text-xs text-red-400">*requerido</span>}
                  </div>
                ))}
                {formFields.length === 0 && (
                  <p className="text-slate-400 text-sm py-4 text-center">
                    Sin campos personalizados. Se usarán los campos predeterminados (nombre, apellido, teléfono, email).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Terms ── */}
        <TabsContent value="terms">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 space-y-6">
              <MarkdownEditor
                label="Bases y Condiciones de la Trivia"
                value={watch('termsAndConditions') ?? ''}
                onChange={v => setValue('termsAndConditions', v)}
                placeholder="## Bases y Condiciones\n\nEscribe aquí las reglas y condiciones de esta trivia..."
                minHeight={300}
              />
              <MarkdownEditor
                label="Instrucciones de Juego"
                value={watch('gameInstructions') ?? ''}
                onChange={v => setValue('gameInstructions', v)}
                placeholder="## Cómo jugar\n\n1. Lee cada pregunta con atención\n2. Responde antes de que se acabe el tiempo\n3. Las respuestas más rápidas suman más puntos"
                minHeight={200}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Question dialog */}
      <QuestionDialog
        open={qDialogOpen}
        initialData={editingQ}
        onClose={() => { setQDialogOpen(false); setEditingQ(null) }}
        onSave={saveQuestion}
      />

      {/* Import dialog */}
      {savedId && (
        <QuestionImporter
          triviaId={savedId}
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImported={async () => {
            const res = await fetch(`/api/admin/trivias/${savedId}`)
            const data = await res.json()
            setQuestions(data.questions ?? [])
            setImportOpen(false)
          }}
        />
      )}
    </div>
  )
}

function QuestionDialog({ open, initialData, onClose, onSave }: {
  open: boolean
  initialData: any | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: initialData ? {
      question: initialData.question,
      optionA: (initialData.options as string[])[0] ?? '',
      optionB: (initialData.options as string[])[1] ?? '',
      optionC: (initialData.options as string[])[2] ?? '',
      optionD: (initialData.options as string[])[3] ?? '',
      correctAnswer: initialData.correctAnswer,
      points: initialData.points,
      timeLimit: initialData.timeLimit,
    } : { correctAnswer: 0, points: 100, timeLimit: 30 },
  })

  useEffect(() => {
    reset(initialData ? {
      question: initialData.question,
      optionA: (initialData.options as string[])[0] ?? '',
      optionB: (initialData.options as string[])[1] ?? '',
      optionC: (initialData.options as string[])[2] ?? '',
      optionD: (initialData.options as string[])[3] ?? '',
      correctAnswer: initialData.correctAnswer,
      points: initialData.points,
      timeLimit: initialData.timeLimit,
    } : { correctAnswer: 0, points: 100, timeLimit: 30 })
  }, [initialData, reset])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Pregunta' : 'Nueva Pregunta'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-3">
          <div>
            <Label>Pregunta *</Label>
            <Textarea {...register('question', { required: true })} rows={2} className="mt-1" placeholder="Escribe la pregunta aquí..." />
          </div>
          {['A', 'B', 'C', 'D'].map((letter, idx) => (
            <div key={letter} className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center flex-shrink-0">{letter}</span>
              <Input {...register(`option${letter}` as any, { required: idx < 2 })} placeholder={`Opción ${letter}`} />
              <input type="radio" value={idx} {...register('correctAnswer')} className="flex-shrink-0" />
            </div>
          ))}
          <p className="text-xs text-slate-400">Selecciona el radio de la respuesta correcta (A, B, C o D)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Puntos</Label>
              <Input type="number" min={1} max={10000} {...register('points')} className="mt-1" />
            </div>
            <div>
              <Label>Tiempo (segundos)</Label>
              <Input type="number" min={5} max={300} {...register('timeLimit')} className="mt-1" />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Guardar Pregunta</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
