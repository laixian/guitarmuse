'use client'

import { useEffect, Suspense } from 'react'
import { AudioUploader } from '../components/audio-uploader'
import { ProcessingStatus } from '../components/processing-status'
import { AudioPlayer } from '../components/audio-player'
import { ChordChart } from '../components/chord-chart'
import { ErrorNotice } from '../components/error-notice'
import { useAudioStore } from '../store/audio-store'

export default function AnalysisPage() {
  const { isProcessing, processingProgress, analysisResult, audioUrl, audioFile } = useAudioStore()
  
  // 是否显示结果 - 当分析结果存在且处理已完成
  const showResults = !isProcessing && analysisResult !== null && processingProgress === 100
  
  // 处理组件卸载清理
  useEffect(() => {
    return () => {
      // 使用新的清理方法
      useAudioStore.getState().clearAudio()
    }
  }, [])
  
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">GuitarMuse</h1>
            <p className="text-lg text-gray-600">
              上传音频，快速获取吉他功能谱
            </p>
          </header>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            {!showResults && (
              <>
                <h2 className="text-xl font-semibold mb-4">上传音乐文件</h2>
                <p className="text-gray-600 mb-6">
                  支持MP3和WAV格式的音频文件。我们将分析音频并生成易于阅读的吉他功能谱。
                </p>
                <AudioUploader />
              </>
            )}
            
            {isProcessing && (
              <ProcessingStatus progress={processingProgress} />
            )}
            
            {showResults && analysisResult && (
              <div className="space-y-8">
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">分析结果</h2>
                      <p className="text-gray-600">
                        调性: {analysisResult.key} | 速度: {Math.round(analysisResult.tempo)} BPM
                      </p>
                    </div>
                  </div>
                  <div className="w-full">
                    <AudioPlayer url={audioUrl} />
                  </div>
                </div>
                
                <ChordChart />
              </div>
            )}
            
            <ErrorNotice />
          </div>
        </div>
      </div>
    </main>
  )
} 