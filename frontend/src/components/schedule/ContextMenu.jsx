import { useEffect, useRef } from 'react'

export default function ContextMenu({ x, y, empName, dateKey, onCopy, onPaste, onDelete, onClose, canPaste, canCopy }) {
  const menuRef = useRef(null)

  // Clamp to viewport
  const menuW = 160, menuH = 110
  const left = Math.min(x, window.innerWidth - menuW - 8)
  const top = Math.min(y, window.innerHeight - menuH - 8)

  // Close on outside click
  useEffect(() => {
    const handle = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', handle)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handle)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  const btn = 'w-full text-left px-4 py-2 text-sm hover:bg-azul-50 transition-colors'
  const btnDisabled = 'w-full text-left px-4 py-2 text-sm text-muted cursor-not-allowed'

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] bg-white border border-borde rounded-xl shadow-xl overflow-hidden"
      style={{ left, top, width: menuW }}
    >
      <button
        className={canCopy ? btn : btnDisabled}
        disabled={!canCopy}
        onClick={() => { if (canCopy) { onCopy(); onClose() } }}
      >
        Copiar turno
      </button>
      <button
        className={canPaste ? btn : btnDisabled}
        disabled={!canPaste}
        onClick={() => { if (canPaste) { onPaste(); onClose() } }}
      >
        Pegar turno
      </button>
      <div className="border-t border-borde" />
      <button
        className={canCopy ? `${btn} text-danger hover:bg-red-50` : btnDisabled}
        disabled={!canCopy}
        onClick={() => { if (canCopy) { onDelete(); onClose() } }}
      >
        Eliminar turno
      </button>
    </div>
  )
}
