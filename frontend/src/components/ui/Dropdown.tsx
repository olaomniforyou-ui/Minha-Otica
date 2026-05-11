import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface DropdownProps {
  trigger: ReactNode
  children: ReactNode
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, children, align = 'right' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      })
    }
  }

  useEffect(() => {
    if (!open) return
    updateCoords()
    
    const handler = (e: MouseEvent) => {
      // Check if click is outside trigger AND outside portal menu
      // Since menu is in portal, we need a way to check if click was on it
      // For simplicity, we close on any click that isn't the trigger, 
      // but if we click an item it should work before closing.
      // The onClick on the menu div already handles closing after action.
    }
    
    const closeHandler = (e: MouseEvent) => {
      if (triggerRef.current && triggerRef.current.contains(e.target as Node)) return
      setOpen(false)
    }

    window.addEventListener('scroll', updateCoords, true)
    window.addEventListener('resize', updateCoords)
    document.addEventListener('mousedown', closeHandler)
    
    return () => {
      window.removeEventListener('scroll', updateCoords, true)
      window.removeEventListener('resize', updateCoords)
      document.removeEventListener('mousedown', closeHandler)
    }
  }, [open])

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div 
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(!open)
        }} 
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {open && createPortal(
        <div 
          className={cn(
            "fixed z-[9999] mt-1 w-48 rounded-xl border border-slate-100 bg-white shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none py-1 animate-in fade-in zoom-in duration-100",
          )}
          style={{
            top: coords.top,
            left: align === 'right' ? (coords.left + coords.width - 192) : coords.left,
          }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  )
}

export function DropdownItem({ 
  onClick, 
  children, 
  icon,
  className 
}: { 
  onClick: () => void; 
  children: ReactNode; 
  icon?: ReactNode;
  className?: string
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left",
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
