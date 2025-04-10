'use client'

import { useAudioStore } from '../store/audio-store'
import { AnalysisEditor } from './analysis-editor'

export const AnalysisResult = () => {
  const { analysisResult, isProcessing, processingError, isEditing } = useAudioStore()
  
  if (isProcessing) {
    return (
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-4">分析结果</h3>
        <p className="text-gray-600">正在分析音频，请稍候...</p>
      </div>
    )
  }
  
  if (processingError) {
    return (
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-4">分析结果</h3>
        <div className="p-4 bg-red-50 text-red-700 rounded-md">
          <p>音频分析失败: {processingError}</p>
        </div>
      </div>
    )
  }
  
  if (!analysisResult) {
    return null
  }
  
  // 如果是编辑模式或者有分析结果，使用编辑器组件
  if (isEditing || analysisResult) {
    return <AnalysisEditor />
  }
  
  // 简单的只读显示（这部分逻辑已经移至AnalysisEditor组件）
  return null
} 