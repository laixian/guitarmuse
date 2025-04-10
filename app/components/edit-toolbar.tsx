'use client'

import React from 'react'
import { useAudioStore } from '../store/audio-store'
import { EditTool } from '../types/audio'

// 工具定义
const tools: Array<{
  id: EditTool
  icon: React.ReactNode
  label: string
}> = [
  {
    id: 'selector',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
      </svg>
    ),
    label: '选择工具'
  },
  {
    id: 'editChord',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    label: '修改和弦'
  },
  {
    id: 'createSection',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: '创建段落'
  },
  {
    id: 'removeSection',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    ),
    label: '解除段落'
  }
]

export const EditToolbar = () => {
  const { isEditMode, currentTool, setCurrentTool, toggleEditMode, selection, barsPerRow, toggleBarsPerRow } = useAudioStore()
  
  if (!isEditMode) {
    return null
  }
  
  const handleToolClick = (tool: EditTool) => {
    setCurrentTool(tool)
    
    // 手动处理createSection工具的点击事件
    if (tool === 'createSection') {
      // 在切换工具后，确保selection已经更新
      setTimeout(() => {
        // 获取最新状态
        const { selection } = useAudioStore.getState()
        // 判断是否有选中的小节，如果有则打开对话框
        if (selection.selectedMeasureIds.length > 0) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('open-section-dialog'))
          }
        } else {
          console.warn('请先选择小节，再创建段落')
        }
      }, 10)
    }
  }
  
  return (
    <div className="fixed left-6 top-1/2 transform -translate-y-1/2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
      <div className="flex flex-col space-y-3">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool.id)}
            className={`
              p-2.5 rounded-lg transition-all duration-200 relative group
              ${currentTool === tool.id 
                ? 'bg-indigo-100 text-indigo-600 shadow-sm' 
                : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
            `}
            title={tool.label}
          >
            {tool.icon}
            
            {/* 工具提示 */}
            <span className="absolute left-full ml-3 bg-gray-800 text-white px-2.5 py-1.5 text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none z-10">
              {tool.label}
            </span>
          </button>
        ))}
        
        {/* 每行小节数切换按钮 */}
        <div className="border-t border-gray-200 pt-3 mt-1">
          <button
            onClick={toggleBarsPerRow}
            className="p-2.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors w-full group relative"
            title={`每行显示${barsPerRow === 8 ? '4' : '8'}个小节`}
          >
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold">{barsPerRow === 8 ? '8→4' : '4→8'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 ml-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            
            {/* 工具提示 */}
            <span className="absolute left-full ml-3 bg-gray-800 text-white px-2.5 py-1.5 text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none z-10">
              每行显示{barsPerRow === 8 ? '4' : '8'}个小节
            </span>
          </button>
        </div>
        
        {/* 编辑模式开关 */}
        <div className="border-t border-gray-200 pt-3 mt-1">
          <button
            onClick={toggleEditMode}
            className="p-2.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors w-full group relative"
            title="退出编辑模式"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mx-auto">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            
            {/* 工具提示 */}
            <span className="absolute left-full ml-3 bg-gray-800 text-white px-2.5 py-1.5 text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-md pointer-events-none z-10">
              退出编辑
            </span>
          </button>
        </div>
      </div>
    </div>
  )
} 