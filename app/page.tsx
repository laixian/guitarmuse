'use client'
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = 'force-no-store';

import { useEffect, Suspense } from 'react'
import { AudioUploader } from './components/audio-uploader'
import { ProcessingStatus } from './components/processing-status'
import { AudioPlayer } from './components/audio-player'
import { ChordChart } from './components/chord-chart'
import { ErrorNotice } from './components/error-notice'
import { useAudioStore } from './store/audio-store'

export default function Home() {
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
  
  // 快捷键说明
  const shortcuts = [
    { key: 'Esc', description: '取消选择' },
    { key: 'Ctrl+E', description: '开关编辑模式' },
    { key: '点按和弦格子', description: '选择单个和弦' },
    { key: 'Ctrl+点按', description: '多选和弦' },
    { key: '拖动鼠标', description: '框选多个和弦' }
  ]
  
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
                <Suspense fallback={<div>加载中...</div>}>
                  <AudioUploader />
                </Suspense>
              </>
            )}
            
            <ProcessingStatus />
            
            {/* 音频播放器 - 放在上传模块和处理状态之后，始终显示 */}
            {audioFile && audioUrl && (
              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">音频播放器</h3>
                <AudioPlayer />
              </div>
            )}
            
            {showResults && (
              <div className="mt-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">分析结果</h2>
                  <button
                    onClick={() => useAudioStore.getState().clearAudio()}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    重新上传
                  </button>
                </div>
                
                <ErrorNotice />
                <ChordChart />
                
                {/* 快捷键说明 */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <h3 className="font-medium text-gray-700 mb-2">编辑模式快捷键:</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    {shortcuts.map((shortcut, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-white border border-gray-300 rounded shadow-sm text-xs">{shortcut.key}</kbd>
                        <span>{shortcut.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
          
          <footer className="mt-12 text-center text-sm text-gray-500">
            <p>GuitarMuse - 吉他手的智能伴侣</p>
            <p className="mt-1">© {new Date().getFullYear()} GuitarMuse. 保留所有权利。</p>
          </footer>
        </div>
      </div>
    </main>
  )
}
