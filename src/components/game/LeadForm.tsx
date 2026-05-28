// Author: Angel Colman
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Trophy, Loader2 } from 'lucide-react'
import type { TriviaData, AnswerRecord, FormFieldData } from './GameShell'
import Image from 'next/image'
import { mediaUrl } from '@/lib/utils'

interface LeadFormProps {
  trivia: TriviaData
  answers: AnswerRecord[]
  onSubmit: (formData: Record<string, string>) => Promise<void>
}

function getInputType(fieldType: string): string {
  switch (fieldType) {
    case 'email': return 'email'
    case 'phone': return 'tel'
    case 'number': return 'number'
    default: return 'text'
  }
}

export function LeadForm({ trivia, answers, onSubmit }: LeadFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { register, handleSubmit, formState: { errors } } = useForm<Record<string, string>>()

  const logo = mediaUrl(trivia.logoUrl ?? trivia.company?.logoUrl)

  const doSubmit = async (data: Record<string, string>) => {
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit(data)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error al enviar los datos')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fields: FormFieldData[] = trivia.formFields.length > 0 ? trivia.formFields : [
    { id: 'default_nombre', fieldName: 'nombre', fieldLabel: 'Nombre', fieldType: 'text', isRequired: true, options: null, placeholder: 'Ej. Juan', orderIndex: 0 },
    { id: 'default_apellido', fieldName: 'apellido', fieldLabel: 'Apellido', fieldType: 'text', isRequired: true, options: null, placeholder: 'Ej. Pérez', orderIndex: 1 },
    { id: 'default_telefono', fieldName: 'telefono', fieldLabel: 'Teléfono', fieldType: 'phone', isRequired: true, options: null, placeholder: '09XX XXX XXX', orderIndex: 2 },
    { id: 'default_correo', fieldName: 'correo', fieldLabel: 'Correo electrónico', fieldType: 'email', isRequired: false, options: null, placeholder: 'tu@email.com', orderIndex: 3 },
  ]

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-lg animate-fade-in-up">
        <div className="rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div
            className="p-8 text-white text-center"
            style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))` }}
          >
            {logo ? (
              <div className="flex justify-center mb-3">
                {logo && <Image src={logo} alt="Logo" width={100} height={40} className="h-10 w-auto object-contain" unoptimized />}
              </div>
            ) : (
              <Trophy className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--trivia-accent)' }} />
            )}
            <h2 className="text-2xl font-black mb-1">¡Trivia Completada!</h2>
            <p className="text-white/75 text-sm">
              Completa tus datos para guardar tu puntaje oficial.
            </p>
          </div>

          {/* Form */}
          <div className="p-6" style={{ backgroundColor: 'var(--trivia-bg)' }}>
            <form onSubmit={handleSubmit(doSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {fields.map((field, i) => {
                  const isHalf = i < 2 && fields.length >= 2
                  const wrapperClass = isHalf ? '' : 'col-span-2'

                  return (
                    <div key={field.id} className={wrapperClass}>
                      {field.fieldType !== 'checkbox' && (
                        <label
                          className="block text-xs font-bold uppercase tracking-wider mb-1"
                          style={{ color: `${trivia.primaryColor}` }}
                        >
                          {field.fieldLabel}{field.isRequired && ' *'}
                        </label>
                      )}
                      {field.fieldType === 'select' && field.options ? (
                        <select
                          {...register(field.fieldName, { required: field.isRequired ? `${field.fieldLabel} es requerido` : false })}
                          className="w-full px-3 py-2 border-2 rounded-xl outline-none transition-all text-sm bg-white focus:border-blue-500"
                          style={{ borderColor: `${trivia.primaryColor}30`, color: trivia.textColor }}
                        >
                          <option value="">Seleccionar...</option>
                          {field.options.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.fieldType === 'checkbox' ? (
                        <label
                          htmlFor={field.id}
                          className="flex items-start gap-3 p-3 bg-white rounded-xl border-2 cursor-pointer transition-colors hover:bg-slate-50"
                          style={{ borderColor: `${trivia.primaryColor}30` }}
                        >
                          <input
                            type="checkbox"
                            id={field.id}
                            {...register(field.fieldName, { required: field.isRequired ? `${field.fieldLabel} es obligatorio` : false })}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginTop: '2px',
                              flexShrink: 0,
                              accentColor: trivia.primaryColor,
                              cursor: 'pointer',
                            }}
                          />
                          <span className="text-sm select-none leading-tight" style={{ color: trivia.textColor }}>
                            {field.fieldLabel}{field.isRequired && ' *'}
                          </span>
                        </label>
                      ) : field.fieldType === 'textarea' ? (
                        <textarea
                          placeholder={field.placeholder ?? ''}
                          {...register(field.fieldName, { required: field.isRequired ? `${field.fieldLabel} es requerido` : false })}
                          rows={3}
                          className="w-full px-3 py-2 border-2 rounded-xl outline-none transition-all text-sm bg-white focus:border-blue-500"
                          style={{ borderColor: errors[field.fieldName] ? '#ef4444' : `${trivia.primaryColor}30`, color: trivia.textColor }}
                        />
                      ) : (
                        <input
                          type={getInputType(field.fieldType)}
                          placeholder={field.placeholder ?? ''}
                          {...register(field.fieldName, {
                            required: field.isRequired ? `${field.fieldLabel} es requerido` : false,
                            ...(field.fieldType === 'email' ? { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' } } : {}),
                          })}
                          className="w-full px-3 py-2 border-2 rounded-xl outline-none transition-all text-sm bg-white focus:border-blue-500"
                          style={{ borderColor: errors[field.fieldName] ? '#ef4444' : `${trivia.primaryColor}30`, color: trivia.textColor }}
                        />
                      )}
                      {errors[field.fieldName] && (
                        <p className="text-xs text-red-500 mt-1">{String(errors[field.fieldName]?.message)}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {submitError && (
                <div className="col-span-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium text-center">
                  {submitError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 shadow-lg"
                style={{ background: `linear-gradient(135deg, var(--trivia-primary), var(--trivia-secondary))` }}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Guardando...</>
                ) : (
                  <><Trophy className="w-5 h-5" /> Ver mi puntaje</>
                )}
              </button>

              <p className="text-center text-xs opacity-40" style={{ color: trivia.textColor }}>
                Tus datos son confidenciales y serán usados solo para esta trivia.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
