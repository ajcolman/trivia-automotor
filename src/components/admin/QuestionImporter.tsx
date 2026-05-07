// Author: Angel Colman
'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface ImportedQuestion {
  question: string
  options: string[]
  correctAnswer: number
  points: number
  timeLimit: number
}

interface QuestionImporterProps {
  triviaId: string
  open: boolean
  onClose: () => void
  onImported: () => void
}

function parseCsvRow(row: string[]): ImportedQuestion | null {
  // Expected: Pregunta, Opcion A, Opcion B, Opcion C, Opcion D, Respuesta Correcta (A/B/C/D), Puntos, Tiempo
  if (row.length < 6) return null
  const [question, a, b, c, d, correct, points, time] = row
  if (!question || !a || !b || !correct) return null
  const options = [a, b, c, d].filter(Boolean)
  const correctMap: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, a: 0, b: 1, c: 2, d: 3, '0': 0, '1': 1, '2': 2, '3': 3 }
  const correctIdx = correctMap[correct.trim()]
  if (correctIdx === undefined || correctIdx >= options.length) return null
  return {
    question: question.trim(),
    options,
    correctAnswer: correctIdx,
    points: parseInt(points ?? '100') || 100,
    timeLimit: parseInt(time ?? '30') || 30,
  }
}

function downloadTemplate() {
  const header = 'Pregunta,Opcion A,Opcion B,Opcion C,Opcion D,Respuesta Correcta (A/B/C/D),Puntos,Tiempo\n'
  const example = '¿Cuántos equipos juegan en el Mundial 2026?,32,40,48,64,C,100,30\n¿Quién ganó Qatar 2022?,Francia,Brasil,Argentina,Alemania,C,100,30\n'
  const blob = new Blob([header + example], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla-preguntas.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function QuestionImporter({ triviaId, open, onClose, onImported }: QuestionImporterProps) {
  const [preview, setPreview] = useState<ImportedQuestion[]>([])
  const [parseError, setParseError] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState('')

  const processFile = useCallback(async (file: File) => {
    setParseError('')
    setPreview([])

    if (file.name.endsWith('.csv')) {
      const text = await file.text()
      const { parse } = await import('papaparse')
      const result = parse(text, { skipEmptyLines: true })
      const rows = result.data as string[][]
      const dataRows = rows[0]?.[0]?.toLowerCase().includes('pregunta') ? rows.slice(1) : rows
      const questions = dataRows.map(parseCsvRow).filter(Boolean) as ImportedQuestion[]
      if (questions.length === 0) {
        setParseError('No se encontraron preguntas válidas. Verifica el formato del archivo.')
        return
      }
      setPreview(questions)
    } else {
      const { read: xlsxRead, utils } = await import('xlsx')
      const ab = await file.arrayBuffer()
      const wb = xlsxRead(ab)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = utils.sheet_to_json(ws, { header: 1 }) as string[][]
      const dataRows = rows[0]?.[0]?.toString().toLowerCase().includes('pregunta') ? rows.slice(1) : rows
      const questions = dataRows.map(parseCsvRow).filter(Boolean) as ImportedQuestion[]
      if (questions.length === 0) {
        setParseError('No se encontraron preguntas válidas.')
        return
      }
      setPreview(questions)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => files[0] && processFile(files[0]),
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  })

  const handleJsonParse = () => {
    try {
      const data = JSON.parse(jsonInput)
      if (Array.isArray(data)) setPreview(data)
      else setParseError('El JSON debe ser un array de preguntas.')
    } catch {
      setParseError('JSON inválido.')
    }
  }

  const handleImport = async () => {
    if (preview.length === 0) return
    setIsImporting(true)
    try {
      const res = await fetch('/api/admin/questions/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triviaId, questions: preview }),
      })
      const data = await res.json()
      if (res.ok) {
        setImportResult(`✅ ${data.imported} preguntas importadas correctamente.`)
        onImported()
      } else {
        setImportResult(`❌ ${data.error}`)
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Preguntas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="text-xs">
              <Download className="w-3 h-3 mr-1" /> Descargar plantilla CSV
            </Button>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400'}`}
          >
            <input {...getInputProps()} />
            <Upload className="w-6 h-6 text-slate-400 mb-1" />
            <p className="text-sm text-slate-500">Arrastra tu archivo CSV o Excel aquí</p>
          </div>

          {/* JSON input */}
          <div>
            <p className="text-xs text-slate-500 mb-1 font-semibold">O pega JSON (para usuarios técnicos):</p>
            <Textarea
              value={jsonInput}
              onChange={e => setJsonInput(e.target.value)}
              placeholder={'[{"question":"...","options":["A","B","C","D"],"correctAnswer":0,"points":100,"timeLimit":30}]'}
              rows={3}
              className="text-xs font-mono"
            />
            <Button variant="outline" size="sm" onClick={handleJsonParse} className="mt-2 text-xs">
              Parsear JSON
            </Button>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="w-4 h-4" /> {parseError}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">
                Vista previa ({preview.length} preguntas):
              </p>
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xl border p-3 bg-slate-50">
                {preview.map((q, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-semibold text-slate-700">{i + 1}. {q.question}</span>
                    <span className="ml-2 text-green-600">→ {q.options[q.correctAnswer]}</span>
                  </div>
                ))}
              </div>

              {importResult ? (
                <div className="flex items-center gap-2 mt-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {importResult}
                </div>
              ) : (
                <Button onClick={handleImport} disabled={isImporting} className="mt-3 bg-blue-600 hover:bg-blue-700">
                  {isImporting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Importando...</> : `Importar ${preview.length} preguntas`}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
