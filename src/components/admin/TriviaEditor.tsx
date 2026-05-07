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
import { Save, ArrowLeft, Loader2, ExternalLink, Plus, Trash2, GripVertical, X, RotateCcw } from 'lucide-react'
import { ColorPicker } from './ColorPicker'
import { SearchableSelect } from '@/components/ui/searchable-select'
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
  const [fDialogOpen, setFDialogOpen] = useState(false)
  const [editingQ, setEditingQ] = useState<any | null>(null)
  const [editingF, setEditingF] = useState<any | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>(trivia?.logoUrl ?? '')
  const [reseting, setReseting] = useState(false)
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
      brandIds: trivia?.brands?.map((b: { id: string }) => b.id) ?? [],
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
        brandIds: data.brandIds ?? [],
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

  const saveField = async (fData: any) => {
    if (!savedId) { alert('Guarda la trivia primero'); return }
    const body = {
      triviaId: savedId,
      fieldName: fData.fieldName,
      fieldLabel: fData.fieldLabel,
      fieldType: fData.fieldType,
      isRequired: !!fData.isRequired,
      options: fData.options ? fData.options.split(',').map((o: string) => o.trim()).filter(Boolean) : [],
    }

    if (editingF?.id) {
      const res = await fetch(`/api/admin/form-fields/${editingF.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const updated = await res.json()
      setFormFields(fs => fs.map(f => f.id === editingF.id ? updated : f))
    } else {
      const res = await fetch('/api/admin/form-fields', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const created = await res.json()
      setFormFields(fs => [...fs, created])
    }
    setFDialogOpen(false)
  }

  const deleteField = async (id: string) => {
    if (!confirm('¿Eliminar este campo?')) return
    await fetch(`/api/admin/form-fields/${id}`, { method: 'DELETE' })
    setFormFields(fs => fs.filter(f => f.id !== id))
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
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={async () => {
                  if (!confirm('¿Estás seguro de que deseas resetear esta trivia? Se eliminarán todas las participaciones y estadísticas.')) return
                  setReseting(true)
                  try {
                    const res = await fetch(`/api/admin/trivias/${savedId}/reset`, { method: 'POST' })
                    if (res.ok) {
                      alert('Trivia reseteada correctamente')
                      router.refresh()
                    } else {
                      const d = await res.json()
                      alert(d.error || 'Error al resetear')
                    }
                  } finally {
                    setReseting(false)
                  }
                }}
                disabled={reseting}
              >
                {reseting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RotateCcw className="w-3 h-3 mr-1" />}
                Resetear
              </Button>
              <Link href={`/play/${watch('slug')}`} target="_blank">
                <Button variant="outline" size="sm" className="text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" /> Ver trivia
                </Button>
              </Link>
            </>
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
                  <Label className={errors.title ? 'text-red-500' : ''}>Título *</Label>
                  <Input 
                    {...register('title', { required: 'El título es obligatorio' })} 
                    aria-invalid={!!errors.title}
                    placeholder="Copa Mundial 2026" 
                    className="mt-1" 
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{String(errors.title.message)}</p>}
                </div>
                <div className="col-span-2">
                  <Label>Descripción</Label>
                  <Textarea {...register('description')} placeholder="Descripción opcional..." rows={2} className="mt-1" />
                </div>
                <div>
                  <Label className={errors.slug ? 'text-red-500' : ''}>Slug (URL) *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input 
                      {...register('slug', { 
                        required: 'El slug es obligatorio',
                        pattern: { value: /^[a-z0-9-]+$/, message: 'Solo letras minúsculas, números y guiones' }
                      })} 
                      aria-invalid={!!errors.slug}
                      placeholder="copa-mundial-2026" 
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setValue('slug', slugify(watch('title')))}>↻</Button>
                  </div>
                  {errors.slug && <p className="text-xs text-red-500 mt-1">{String(errors.slug.message)}</p>}
                  {!errors.slug && <p className="text-xs text-slate-400 mt-1">/play/<strong>{watch('slug') || 'slug'}</strong></p>}
                </div>
                <div>
                  <Label className={errors.maxPlaysPerUser ? 'text-red-500' : ''}>Máx. participaciones</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={100} 
                    {...register('maxPlaysPerUser', { 
                      required: 'Campo requerido',
                      min: { value: 1, message: 'Mínimo 1' },
                      max: { value: 100, message: 'Máximo 100' }
                    })} 
                    aria-invalid={!!errors.maxPlaysPerUser}
                    className="mt-1" 
                  />
                  {errors.maxPlaysPerUser ? (
                    <p className="text-xs text-red-500 mt-1">{String(errors.maxPlaysPerUser.message)}</p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Por participante</p>
                  )}
                </div>
                <div>
                  <Label>Empresa</Label>
                  <div className="mt-1">
                    <SearchableSelect
                      options={[
                        { value: '', label: 'Sin empresa' },
                        ...companies.map(c => ({ value: c.id, label: c.name })),
                      ]}
                      value={watch('companyId') ?? ''}
                      onChange={val => setValue('companyId', val)}
                      placeholder="Sin empresa"
                    />
                  </div>
                </div>
                <div>
                  <Label>Marcas</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {filteredBrands.length === 0 ? (
                      <p className="text-xs text-slate-400">Sin marcas disponibles para esta empresa.</p>
                    ) : (
                      filteredBrands.map(b => {
                        const selected = (watch('brandIds') ?? []).includes(b.id)
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              const current: string[] = watch('brandIds') ?? []
                              setValue(
                                'brandIds',
                                selected ? current.filter((id: string) => id !== b.id) : [...current, b.id],
                              )
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                              selected
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-slate-600 border-slate-300 hover:border-blue-400'
                            }`}
                          >
                            {b.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
                <div>
                  <Label className={errors.startDate ? 'text-red-500' : ''}>Fecha inicio</Label>
                  <Input 
                    type="datetime-local" 
                    {...register('startDate')} 
                    aria-invalid={!!errors.startDate}
                    className="mt-1" 
                  />
                  {errors.startDate && <p className="text-xs text-red-500 mt-1">{String(errors.startDate.message)}</p>}
                </div>
                <div>
                  <Label className={errors.endDate ? 'text-red-500' : ''}>Fecha fin</Label>
                  <Input 
                    type="datetime-local" 
                    {...register('endDate')} 
                    aria-invalid={!!errors.endDate}
                    className="mt-1" 
                  />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1">{String(errors.endDate.message)}</p>}
                </div>
                <div className="col-span-2">
                  <Label className={errors.gameInstructions ? 'text-red-500' : ''}>Instrucciones de juego</Label>
                  <Textarea 
                    {...register('gameInstructions')} 
                    aria-invalid={!!errors.gameInstructions}
                    placeholder="Instrucciones personalizadas para los participantes..." 
                    rows={3} 
                    className="mt-1" 
                  />
                  {errors.gameInstructions && <p className="text-xs text-red-500 mt-1">{String(errors.gameInstructions.message)}</p>}
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
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Define qué datos recopilar de los participantes al finalizar la trivia.
                  </p>
                </div>
                <Button size="sm" onClick={() => { setEditingF(null); setFDialogOpen(true) }}>
                  <Plus className="w-4 h-4 mr-1" /> Agregar campo
                </Button>
              </div>

              {!savedId && (
                <p className="text-sm text-amber-600 bg-amber-50 rounded-xl p-3 mb-4">
                  ⚠️ Guarda la trivia primero para poder configurar el formulario.
                </p>
              )}

              <div className="space-y-2">
                {formFields.map((f, i) => (
                  <div key={f.id ?? i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                    <GripVertical className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    <div className="w-20 truncate">
                      <span className="text-[10px] font-mono text-slate-400 block uppercase">Slug</span>
                      <span className="text-xs font-mono text-slate-600">{f.fieldName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Etiqueta</span>
                      <span className="text-sm font-medium text-slate-700">{f.fieldLabel}</span>
                    </div>
                    <div className="text-center w-20">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Tipo</span>
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase">{f.fieldType}</span>
                    </div>
                    <div className="w-16 text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Req?</span>
                      <span className={`text-[10px] font-bold ${f.isRequired ? 'text-red-500' : 'text-slate-400'}`}>{f.isRequired ? 'SÍ' : 'NO'}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditingF(f); setFDialogOpen(true) }}>✎</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteField(f.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                {formFields.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-2xl border-slate-100">
                    <p className="text-slate-400 text-sm">
                      Sin campos personalizados. Se usarán los predeterminados:<br/>
                      <span className="text-[10px] mt-1 inline-block">Nombre, Apellido, Teléfono, Email</span>
                    </p>
                  </div>
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
      {/* Field dialog */}
      <FieldDialog
        open={fDialogOpen}
        initialData={editingF}
        onClose={() => { setFDialogOpen(false); setEditingF(null) }}
        onSave={saveField}
        suggestedModels={brands.filter(b => watch('brandIds')?.includes(b.id)).flatMap(b => b.models)}
      />
    </div>
  )
}

function QuestionDialog({ open, initialData, onClose, onSave }: {
  open: boolean
  initialData: any | null
  onClose: () => void
  onSave: (data: any) => void
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<any>({
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
            <Label className={errors.question ? 'text-red-500' : ''}>Pregunta *</Label>
            <Textarea 
              {...register('question', { required: 'La pregunta es obligatoria' })} 
              aria-invalid={!!errors.question}
              rows={2} 
              className="mt-1" 
              placeholder="Escribe la pregunta aquí..." 
            />
            {errors.question && <p className="text-xs text-red-500 mt-1">{String(errors.question.message)}</p>}
          </div>
          {['A', 'B', 'C', 'D'].map((letter, idx) => {
            const fieldName = `option${letter}` as const;
            const error = errors[fieldName];
            return (
              <div key={letter} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full font-bold text-sm flex items-center justify-center flex-shrink-0 ${error ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                    {letter}
                  </span>
                  <Input 
                    {...register(fieldName, { required: idx < 2 ? `La opción ${letter} es obligatoria` : false })} 
                    aria-invalid={!!error}
                    placeholder={`Opción ${letter}`} 
                  />
                  <input type="radio" value={idx} {...register('correctAnswer')} className="flex-shrink-0" title="Respuesta correcta" />
                </div>
                {error && <p className="text-[10px] text-red-500 ml-9">{String(error.message)}</p>}
              </div>
            )
          })}
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

function FieldDialog({ open, initialData, onClose, onSave, suggestedModels }: {
  open: boolean
  initialData: any | null
  onClose: () => void
  onSave: (data: any) => void
  suggestedModels: string[]
}) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<any>({
    defaultValues: initialData ? {
      fieldName: initialData.fieldName,
      fieldLabel: initialData.fieldLabel,
      fieldType: initialData.fieldType,
      isRequired: initialData.isRequired,
      options: initialData.options?.join(', ') ?? '',
    } : { fieldType: 'text', isRequired: true, options: '' },
  })

  const type = watch('fieldType')

  useEffect(() => {
    reset(initialData ? {
      fieldName: initialData.fieldName,
      fieldLabel: initialData.fieldLabel,
      fieldType: initialData.fieldType,
      isRequired: initialData.isRequired,
      options: initialData.options?.join(', ') ?? '',
    } : { fieldType: 'text', isRequired: true, options: '' })
  }, [initialData, reset])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Campo' : 'Nuevo Campo del Formulario'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div>
            <Label className={errors.fieldLabel ? 'text-red-500' : ''}>Etiqueta (Lo que verá el usuario) *</Label>
            <Input 
              {...register('fieldLabel', { required: 'La etiqueta es obligatoria' })} 
              onChange={e => {
                setValue('fieldLabel', e.target.value)
                if (!initialData) setValue('fieldName', slugify(e.target.value).replace(/-/g, '_'))
              }}
              placeholder="Ej: Modelo de interés" 
              className="mt-1" 
              aria-invalid={!!errors.fieldLabel}
            />
            {errors.fieldLabel && <p className="text-xs text-red-500 mt-1">{String(errors.fieldLabel.message)}</p>}
          </div>
          <div>
            <Label className={errors.fieldName ? 'text-red-500' : ''}>Identificador (Slug interno) *</Label>
            <Input 
              {...register('fieldName', { required: 'El identificador es obligatorio' })} 
              placeholder="ej_modelo_interes" 
              className="mt-1 font-mono text-xs" 
              aria-invalid={!!errors.fieldName}
            />
            {errors.fieldName && <p className="text-xs text-red-500 mt-1">{String(errors.fieldName.message)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Campo</Label>
              <select 
                {...register('fieldType')} 
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="text">Texto Corto</option>
                <option value="email">Email</option>
                <option value="phone">Teléfono</option>
                <option value="number">Número</option>
                <option value="select">Lista de Selección</option>
              </select>
            </div>
            <div className="flex items-end pb-2 gap-2">
              <Switch {...register('isRequired')} onCheckedChange={v => setValue('isRequired', v)} />
              <Label className="mb-0.5">Obligatorio</Label>
            </div>
          </div>

          {type === 'select' && (
            <div className="space-y-2">
              <Label>Opciones (separadas por comas)</Label>
              <Textarea 
                {...register('options')} 
                placeholder="Opción 1, Opción 2, Opción 3" 
                rows={3}
                className="text-sm"
              />
              {suggestedModels.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sugerencias de modelos:</p>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(suggestedModels)).map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const current = watch('options')
                          const opts = current ? current.split(',').map((o: string) => o.trim()) : []
                          if (!opts.includes(m)) {
                            setValue('options', opts.length > 0 ? [...opts, m].join(', ') : m)
                          }
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-blue-100 hover:text-blue-700 px-2 py-0.5 rounded-full transition-colors"
                      >
                        + {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Guardar Campo</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
