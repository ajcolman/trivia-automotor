// Author: Angel Colman
'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ReactMarkdown from 'react-markdown'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => <div className="h-48 bg-slate-50 rounded-xl animate-pulse" />,
})

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  minHeight?: number
}

export function MarkdownEditor({ value, onChange, label, placeholder, minHeight = 200 }: MarkdownEditorProps) {
  return (
    <div className="space-y-1" data-color-mode="light">
      {label && <p className="text-sm font-semibold text-slate-700">{label}</p>}
      <Tabs defaultValue="edit">
        <TabsList className="h-8 mb-2">
          <TabsTrigger value="edit" className="text-xs h-6">Editar</TabsTrigger>
          <TabsTrigger value="preview" className="text-xs h-6">Vista previa</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <MDEditor
            value={value}
            onChange={v => onChange(v ?? '')}
            preview="edit"
            height={minHeight}
            textareaProps={{ placeholder: placeholder }}
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-[200px] p-4 border rounded-xl bg-white prose prose-sm max-w-none">
            {value ? (
              <ReactMarkdown>{value}</ReactMarkdown>
            ) : (
              <p className="text-slate-400 italic">Sin contenido para previsualizar.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
      <p className="text-xs text-slate-400">Soporta formato Markdown: **negrita**, *cursiva*, ## títulos, - listas</p>
    </div>
  )
}
