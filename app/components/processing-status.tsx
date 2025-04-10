'use client'

import { useAudioStore } from '../store/audio-store'

export const ProcessingStatus = () => {
  const { 
    isProcessing, 
    processingProgress,
    uploadProgress,
    processingError 
  } = useAudioStore()
  
  if (!isProcessing && processingProgress === 0) {
    return null
  }
  
  if (processingError) {
    return (
      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="text-lg font-medium text-red-800">处理出错</h3>
        <p className="mt-2 text-sm text-red-700">{processingError || '音频处理过程中发生错误，请重试。'}</p>
        <button
          onClick={() => useAudioStore.getState().clearAudio()}
          className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors"
        >
          重试
        </button>
      </div>
    )
  }
  
  // 如果上传进度小于100%，优先显示上传进度
  const isUploading = uploadProgress < 100
  const displayProgress = isUploading ? uploadProgress : processingProgress
  const statusText = isUploading ? '正在上传文件' : '正在分析音频'
  
  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
      <h3 className="text-lg font-medium text-blue-800">
        {statusText}
      </h3>
      
      <div className="mt-3 h-2 w-full bg-blue-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
      
      <p className="mt-2 text-sm text-blue-700">
        {isProcessing 
          ? (isUploading 
              ? `上传中 (${Math.round(uploadProgress)}%)` 
              : `处理中 (${Math.round(processingProgress)}%)`)
          : '处理完成'}
      </p>
    </div>
  )
} 