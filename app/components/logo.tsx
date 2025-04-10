'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface LogoProps {
  size?: 'small' | 'medium' | 'large'
  onClick?: () => void
}

export const Logo: React.FC<LogoProps> = ({ size = 'medium', onClick }) => {
  const router = useRouter()
  
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push('/')
    }
  }
  
  // 根据不同尺寸设置不同的样式
  const textSizeClasses = {
    small: 'text-xl',
    medium: 'text-3xl',
    large: 'text-5xl md:text-7xl'
  }
  
  const paddingClasses = {
    small: 'px-1.5 py-0.5',
    medium: 'px-2 py-1',
    large: 'px-3 py-1'
  }
  
  const lineHeightClasses = {
    small: 'h-0.5',
    medium: 'h-1',
    large: 'h-1'
  }
  
  return (
    <div 
      className={`${textSizeClasses[size]} font-bold flex items-center justify-center cursor-pointer group`}
      onClick={handleClick}
    >
      <span className="text-gray-800 mr-1 relative">
        Guitar
        <span className={`absolute bottom-0 left-0 w-full ${lineHeightClasses[size]} bg-gray-800 transform origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-300`}></span>
      </span>
      <span className={`bg-gradient-to-r from-red-400 to-red-500 text-white ${paddingClasses[size]} rounded-md shadow-md transform hover:scale-105 transition-transform duration-300`}>Muse</span>
    </div>
  )
} 