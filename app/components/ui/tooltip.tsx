'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'

interface TooltipProps {
  children: React.ReactNode
  className?: string
}

const TooltipContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
}>({
  open: false,
  setOpen: () => {}
})

export const Tooltip = ({ children, className }: TooltipProps) => {
  const [open, setOpen] = React.useState(false)
  
  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <div className={cn('relative inline-block', className)}>
        {children}
      </div>
    </TooltipContext.Provider>
  )
}

export const TooltipTrigger = ({ 
  children, 
  asChild = false 
}: { 
  children: React.ReactNode
  asChild?: boolean
}) => {
  const { setOpen } = React.useContext(TooltipContext)
  
  const childElement = asChild && React.isValidElement(children) 
    ? React.cloneElement(children as React.ReactElement<any>, {
        onMouseEnter: () => setOpen(true),
        onMouseLeave: () => setOpen(false),
        onFocus: () => setOpen(true),
        onBlur: () => setOpen(false),
      })
    : <div 
        className="inline-block" 
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children}
      </div>
  
  return childElement
}

export const TooltipContent = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode
  className?: string
}) => {
  const { open } = React.useContext(TooltipContext)
  
  if (!open) return null
  
  return (
    <div className={cn(
      'absolute z-50 px-3 py-1.5 text-sm bg-slate-900 text-white rounded-md',
      'left-1/2 -translate-x-1/2 -translate-y-full -mt-1',
      'opacity-100 transition-opacity duration-200',
      className
    )}>
      {children}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 h-0 w-0" />
    </div>
  )
}

export const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
} 