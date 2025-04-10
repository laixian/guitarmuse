'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useAudioStore } from '../store/audio-store'

export const AudioUploader = () => {
  const { setAudioFile, startProcessing, setPreferredKey } = useAudioStore()
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    if (!file.type.includes('audio')) {
      alert('请上传有效的音频文件（MP3或WAV）')
      return
    }
    
    // 设置文件到新的存储API
    setAudioFile(file)
    
    // 使用默认调性E
    setPreferredKey('E')
    
    // 开始处理（新API无需传递文件）
    startProcessing()
  }, [setAudioFile, startProcessing, setPreferredKey])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav']
    },
    maxFiles: 1
  })
  
  return (
    <div 
      {...getRootProps()} 
      className={`p-10 border-2 border-dashed rounded-lg cursor-pointer transition-colors
        ${isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}
    >
      <input {...getInputProps()} />
      <div className="text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
        
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive 
            ? '拖放音频文件至此处...' 
            : '点击上传或拖放一个MP3或WAV文件'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          支持MP3和WAV格式，文件大小限制50MB
        </p>
      </div>
    </div>
  )
} 