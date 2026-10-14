import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface FieldShellProps {
  label: string
  error?: string
  hint?: string
  children: (id: string, describedBy: string | undefined) => ReactNode
}

/** Label + control + error wiring. Errors render with aria-describedby so
 * screen readers announce them with the field. */
export function FieldShell({ label, error, hint, children }: FieldShellProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={error ? 'field field-invalid' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {children(id, describedBy || undefined)}
      {error ? (
        <p id={errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>

export function TextField({
  label,
  error,
  hint,
  ...inputProps
}: TextFieldProps & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(id, describedBy) => <input id={id} aria-describedby={describedBy} {...inputProps} />}
    </FieldShell>
  )
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>

export function SelectField({
  label,
  error,
  children,
  ...selectProps
}: SelectFieldProps & { label: string; error?: string }) {
  return (
    <FieldShell label={label} error={error}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} {...selectProps}>
          {children}
        </select>
      )}
    </FieldShell>
  )
}

type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>

export function TextAreaField({
  label,
  error,
  hint,
  ...textareaProps
}: TextAreaFieldProps & { label: string; error?: string; hint?: string }) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {(id, describedBy) => <textarea id={id} aria-describedby={describedBy} {...textareaProps} />}
    </FieldShell>
  )
}
