import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { GhostButton, PrimaryButton } from './kit'
import { useEscLayer } from '../../hooks/useEscLayer'

export function NexusModal({
  title,
  children,
  onClose,
  onSave,
  saveLabel = 'Salvar',
  cancelLabel = 'Cancelar',
  saving = false,
  saveDisabled = false,
  closeOnBackdrop = true,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  onSave?: () => void
  saveLabel?: string
  cancelLabel?: string
  saving?: boolean
  saveDisabled?: boolean
  closeOnBackdrop?: boolean
}) {
  useEscLayer(!saving, onClose)

  return (
    <div
      className="nexus-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6"
      style={{ background: 'var(--code-overlay)' }}
      onClick={() => {
        if (closeOnBackdrop && !saving) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="nexus-card w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b shrink-0" style={{ borderColor: 'var(--code-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--code-text)' }}>{title}</h2>
          <button
            type="button"
            className="p-1 rounded"
            style={{ color: 'var(--code-text)' }}
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t shrink-0" style={{ borderColor: 'var(--code-border)', background: 'var(--code-surface)' }}>
          <GhostButton type="button" onClick={onClose} disabled={saving}>{cancelLabel}</GhostButton>
          {onSave && (
            <PrimaryButton type="button" onClick={onSave} disabled={saving || saveDisabled}>
              {saving ? 'Salvando...' : saveLabel}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  )
}
