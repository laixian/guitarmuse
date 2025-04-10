'use client'

import React, { useState, useEffect } from 'react'
import { useAudioStore } from '../store/audio-store'
import { SectionType } from '../types/audio'

// 可用的段落类型
const SECTION_TYPES: SectionType[] = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Solo', 'Outro', 'Any']

// 段落类型图标和描述
const SECTION_TYPE_INFO: Record<SectionType, {icon: string, description: string}> = {
  'Intro': {
    icon: '🎬',
    description: '歌曲开始部分，通常是乐器引入'
  },
  'Verse': {
    icon: '🎤',
    description: '主歌部分，演唱主要歌词内容'
  },
  'Chorus': {
    icon: '🎵',
    description: '副歌部分，歌曲最核心的旋律'
  },
  'Bridge': {
    icon: '🌉',
    description: '过渡段落，连接其他主要部分'
  },
  'Solo': {
    icon: '🎸',
    description: '独奏部分，通常是乐器表现'
  },
  'Outro': {
    icon: '🏁',
    description: '歌曲结束部分'
  },
  'Any': {
    icon: '📋',
    description: '通用段落，无特定结构定义'
  }
}

export const SectionDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<SectionType | null>(null);
  const { selection } = useAudioStore();
  
  // 移除对工具变化的自动监听，只监听自定义事件
  useEffect(() => {
    const handleOpenDialog = () => {
      // 只有当有选中的小节时才打开对话框
      const store = useAudioStore.getState();
      if (store.selection.selectedMeasureIds.length > 0) {
        setIsOpen(true);
      } else {
        console.warn('没有选中的小节，无法创建段落');
      }
    };
    
    window.addEventListener('open-section-dialog', handleOpenDialog);
    return () => {
      window.removeEventListener('open-section-dialog', handleOpenDialog);
    };
  }, []);
  
  const handleClose = () => {
    setIsOpen(false);
    setSelectedType(null);
  }
  
  const handleSubmit = () => {
    if (!selectedType) return;
    
    // 通过自定义事件触发段落创建
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('create-section', { 
        detail: { type: selectedType }
      }));
    }
    
    handleClose();
  }
  
  if (!isOpen) return null;
  
  const selectedCount = selection?.selectedMeasureIds?.length || 0;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 className="text-xl font-semibold mb-2">创建段落</h3>
        <p className="text-gray-600 mb-2">已选择 {selectedCount} 个和弦小节</p>
        <p className="text-gray-600 mb-4">请为这些小节选择一个段落类型:</p>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          {SECTION_TYPES.map((type) => {
            const info = SECTION_TYPE_INFO[type];
            const isTypeSelected = selectedType === type;
            
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  p-3 border rounded-lg text-left transition-all flex items-center
                  ${isTypeSelected 
                    ? 'bg-indigo-100 border-indigo-300 text-indigo-800 shadow-sm' 
                    : 'border-gray-200 hover:bg-gray-50'}
                `}
              >
                <span className="text-2xl mr-3">{info.icon}</span>
                <div>
                  <div className="font-medium">{type}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-1">{info.description}</div>
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedType}
            className={`
              px-4 py-2 rounded-lg text-white transition-colors
              ${selectedType
                ? 'bg-indigo-600 hover:bg-indigo-700'
                : 'bg-gray-400 cursor-not-allowed'}
            `}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
} 