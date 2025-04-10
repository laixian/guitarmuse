'use client'

import React from 'react'

interface AudioWaveSimpleProps {
  color?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export const AudioWaveSimple: React.FC<AudioWaveSimpleProps> = ({
  color = 'rgba(79, 70, 229, 0.2)', // 默认为淡紫色
  size = 'medium',
  className = ''
}) => {
  // 不同尺寸的配置
  const sizeConfig = {
    small: {
      height: '80px',
      barWidth: '3px',
      gap: '3px',
      barCount: 10
    },
    medium: {
      height: '120px',
      barWidth: '4px',
      gap: '4px',
      barCount: 16
    },
    large: {
      height: '160px',
      barWidth: '6px',
      gap: '6px',
      barCount: 20
    }
  }
  
  const config = sizeConfig[size]
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-end justify-center"
        style={{ 
          height: config.height,
          gap: config.gap
        }}
      >
        {Array.from({ length: config.barCount }).map((_, index) => {
          // 生成中间高，两边低的波浪形状
          const heightFactor = Math.sin((index / config.barCount) * Math.PI) 
          const height = 20 + heightFactor * 80 // 高度在20%-100%之间变化
          
          return (
            <div
              key={index}
              className="rounded-full bar-animate"
              style={{
                width: config.barWidth,
                backgroundColor: color,
                height: `${height}%`,
                animationDelay: `${index * 0.1}s`
              }}
            />
          )
        })}
      </div>
      
      {/* 添加音符图标 */}
      <div className="absolute top-1/3 left-1/4 opacity-50 animate-bounce">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-indigo-500">
          <path d="M9 17V5L21 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="18" cy="15" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
      
      {/* 添加第二个音符，位置和动画不同 */}
      <div className="absolute bottom-1/4 right-1/4 opacity-30 animate-pulse">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-red-500">
          <path d="M9 17V5L21 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="6" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
          <circle cx="18" cy="15" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
} 