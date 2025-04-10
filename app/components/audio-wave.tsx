'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface AudioWaveProps {
  color?: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export const AudioWave: React.FC<AudioWaveProps> = ({
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
      barCount: 20
    },
    medium: {
      height: '120px',
      barWidth: '4px',
      gap: '4px',
      barCount: 32
    },
    large: {
      height: '160px',
      barWidth: '6px',
      gap: '6px',
      barCount: 40
    }
  }
  
  const config = sizeConfig[size]
  
  // 生成不同高度和动画延迟的音频条
  const bars = Array.from({ length: config.barCount }).map((_, index) => {
    // 生成中间高，两边低的波浪形状
    const heightFactor = Math.sin((index / config.barCount) * Math.PI)
    const height = 0.3 + heightFactor * 0.7 // 高度在30%-100%之间变化
    
    return (
      <motion.div
        key={index}
        className="rounded-full"
        style={{
          width: config.barWidth,
          backgroundColor: color,
          height: '100%',
          transformOrigin: 'bottom',
        }}
        animate={{
          scaleY: [
            height * 0.6, 
            height * 1.0, 
            height * 0.8, 
            height * 1.0, 
            height * 0.6
          ]
        }}
        transition={{
          duration: 2.5,
          ease: "easeInOut",
          repeat: Infinity,
          delay: (index / config.barCount) * 0.5
        }}
      />
    )
  })
  
  // 创建音符图标
  const MusicNotes = () => (
    <>
      {[0, 1, 2].map(index => (
        <motion.div 
          key={index}
          className="absolute opacity-60"
          style={{
            top: `${20 + index * 25}%`,
            left: `${10 + index * 30}%`,
          }}
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 20],
            opacity: [0, 0.6, 0],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 3 + index,
            ease: "easeInOut",
            repeat: Infinity,
            delay: index * 1.5
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-indigo-500"
          >
            <path 
              d="M9 18V5L21 3V16" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        </motion.div>
      ))}
    </>
  )
  
  return (
    <div className={`relative ${className}`}>
      <div 
        className="relative flex items-end justify-center gap-[4px]"
        style={{ 
          height: config.height,
          gap: config.gap
        }}
      >
        {bars}
      </div>
      
      <MusicNotes />
    </div>
  )
} 