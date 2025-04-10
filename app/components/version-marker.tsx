'use client'

import React from 'react'

export const VersionMarker: React.FC = () => {
  // 生成一个基于当前时间的版本号，确保每次加载时都会更新
  const version = `v${new Date().getTime()}`
  
  return (
    <div className="fixed bottom-0 left-0 z-[9999] bg-black/50 text-white text-xs p-1 rounded-tr-md">
      {version}
    </div>
  )
} 