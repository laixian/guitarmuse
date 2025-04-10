'use client'

import { useState, useRef } from 'react'
import { useAudioStore } from '../store/audio-store'
import { Button } from "@/app/ui/button"
import { Input } from "@/app/ui/input"
import { Badge } from "@/app/ui/badge"
import { Upload, Music } from 'lucide-react'
import { Card, CardContent } from "@/app/ui/card"
// import { AudioVisualizer } from './audio-visualizer'
import { detectKeySimple } from '../lib/audio-analyzer-adapter'

// 简化的音频可视化组件（作为替代）
const AudioVisualizer = ({ audioUrl }: { audioUrl: string }) => {
  return (
    <div className="w-full h-24 bg-slate-100 rounded-md overflow-hidden">
      <audio
        src={audioUrl}
        controls
        className="w-full h-full"
      />
    </div>
  )
}

export const AudioUpload = () => {
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [detectedKey, setDetectedKey] = useState<string>('E')
  const [isDetectingKey, setIsDetectingKey] = useState(false)
  
  // 使用新的音频存储结构
  const { 
    setAudioFile, 
    startProcessing, 
    setPreferredKey,
    isProcessing, 
    processingError
  } = useAudioStore(state => ({
    setAudioFile: state.setAudioFile,
    startProcessing: state.startProcessing,
    setPreferredKey: state.setPreferredKey,
    isProcessing: state.isProcessing,
    processingError: state.processingError
  }))

  // 处理文件选择
  const handleFileSelect = async (file: File) => {
    if (!file) return
    
    setSelectedFile(file)
    
    // 创建可播放的URL预览
    const fileUrl = URL.createObjectURL(file)
    setPreviewUrl(fileUrl)
    
    // 设置音频文件到商店
    setAudioFile(file)
    
    // 尝试检测音频的调性
    await detectAudioKey(file)
  }
  
  // 尝试检测音频的调性
  const detectAudioKey = async (file: File) => {
    try {
      setIsDetectingKey(true)
      
      // 使用音频分析适配器的简单版本检测调性
      const key = await detectKeySimple(file)
      setDetectedKey(key)
      console.log('检测到的调性:', key)
      
      // 设置首选调性到商店
      setPreferredKey(key)
    } catch (error) {
      console.error('调性检测失败:', error)
      // 出错时使用默认的E调
      setDetectedKey('E')
      setPreferredKey('E')
    } finally {
      setIsDetectingKey(false)
    }
  }

  // 处理文件输入变化
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 处理拖拽开始
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  // 处理拖拽离开
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  // 处理拖拽悬停
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  // 处理文件拖放
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // 触发文件选择器
  const handleButtonClick = () => {
    audioInputRef.current?.click()
  }

  // 开始处理音频
  const handleProcessAudio = async () => {
    if (!selectedFile) return
    
    try {
      // 设置首选调性
      setPreferredKey(detectedKey)
      
      // 开始处理
      await startProcessing()
    } catch (err) {
      console.error('处理音频失败:', err)
    }
  }
  
  // 手动更改调性
  const handleKeyChange = (newKey: string) => {
    setDetectedKey(newKey)
    setPreferredKey(newKey)
  }

  // 获取文件大小的易读形式
  const getReadableFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    else return (bytes / 1048576).toFixed(1) + ' MB'
  }

  // 可选择的调性列表
  const availableKeys = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    'Am', 'A#m', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
  ]

  // 清除上传的文件
  const handleClearFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    
    // 如果有预览URL，释放它
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  }

  return (
    <Card className="w-full bg-background/60 backdrop-blur-sm">
      <CardContent className="p-4">
        <div
          className={`
            flex flex-col items-center justify-center w-full rounded-md 
            border-2 border-dashed p-6 transition-colors
            ${dragActive ? 'border-primary bg-primary/5' : 'border-border'}
            ${processingError ? 'border-destructive' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {previewUrl ? (
            <div className="w-full space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Music className="h-5 w-5 text-muted-foreground" />
                  <div className="text-sm font-medium">{selectedFile?.name}</div>
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-input">
                    {getReadableFileSize(selectedFile?.size || 0)}
                  </div>
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">
                    {isDetectingKey ? '检测调性中...' : `调性: ${detectedKey}`}
                  </div>
                  
                  {/* 调性选择器 */}
                  <div className="ml-2">
                    <select 
                      value={detectedKey}
                      onChange={(e) => handleKeyChange(e.target.value)}
                      className="text-xs font-medium bg-background border border-input rounded p-1"
                      disabled={isProcessing}
                    >
                      {availableKeys.map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="w-full">
                <AudioVisualizer audioUrl={previewUrl} />
              </div>
              
              <div className="flex justify-end space-x-2">
                <button 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                  onClick={handleClearFile}
                  disabled={isProcessing}
                >
                  取消
                </button>
                <button 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  onClick={handleProcessAudio} 
                  disabled={isProcessing || isDetectingKey}
                >
                  {isProcessing ? '处理中...' : '开始处理'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4 py-4">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <div className="flex flex-col items-center space-y-1 text-center">
                <h3 className="text-lg font-medium">拖放音频文件或点击上传</h3>
                <p className="text-sm text-muted-foreground">
                  支持 MP3, WAV, AIFF 或 M4A 文件 (最大 15MB)
                </p>
              </div>
              <button 
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                onClick={handleButtonClick}
              >
                选择音频文件
              </button>
            </div>
          )}
          
          {processingError && (
            <div className="mt-4 text-sm text-destructive">{processingError}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 