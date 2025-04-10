'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ 
  open = false, 
  onOpenChange, 
  children 
}: DialogProps) {
  if (!open) return null
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div 
        className="absolute inset-0" 
        onClick={() => onOpenChange?.(false)}
      />
      <div className="relative">{children}</div>
    </div>
  )
}

export function DialogContent({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      "bg-white rounded-lg shadow-lg w-full max-w-lg p-6 animate-in fade-in-0 zoom-in-95",
      className
    )}>
      {children}
    </div>
  )
}

export function DialogHeader({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  )
}

export function DialogTitle({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <h2 className={cn("text-xl font-semibold", className)}>
      {children}
    </h2>
  )
}

export function DialogFooter({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex justify-end space-x-2 mt-6", className)}>
      {children}
    </div>
  )
} 