'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface AudioVisualizerProps {
  audioUrl: string
}

type AudioContextType = typeof AudioContext;

interface WindowWithAudioContext extends Window {
  webkitAudioContext: AudioContextType;
}

const windowWithAudioContext = window as unknown as WindowWithAudioContext;

export const AudioVisualizer = ({ audioUrl }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  
  // 初始化音频上下文和分析器
  useEffect(() => {
    if (!audioUrl) return
    
    const audio = audioRef.current
    if (!audio) return
    
    audio.src = audioUrl
    audio.load()
    
    return () => {
      audio.pause()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [audioUrl])
  
  // 音频播放/暂停处理
  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    } else {
      audio.play()
      setIsPlaying(true)
      visualize()
    }
  }
  
  // 可视化音频
  const visualize = useCallback(() => {
    if (!canvasRef.current || !audioRef.current) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const AudioContextClass = window.AudioContext || windowWithAudioContext.webkitAudioContext;
    // @ts-ignore
    const audioContext = new AudioContextClass()
    audioContextRef.current = audioContext
    
    const analyser = audioContext.createAnalyser()
    analyserRef.current = analyser
    analyser.fftSize = 256
    
    const source = audioContext.createMediaElementSource(audioRef.current)
    source.connect(analyser)
    analyser.connect(audioContext.destination)
    
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.height
    
    const WIDTH = canvas.width
    const HEIGHT = canvas.height
    const barWidth = (WIDTH / bufferLength) * 2.5
    
    const draw = () => {
      if (!ctx || !analyser) return
      
      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)
      
      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      
      ctx.fillStyle = 'rgb(0, 0, 0)'
      ctx.fillRect(0, 0, WIDTH, HEIGHT)
      
      let x = 0
      let barHeight
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2
        
        ctx.fillStyle = `rgb(${barHeight + 100},50,50)`
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight)
        
        x += barWidth + 1
      }
    }
    
    draw()
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      audioContext.close()
    }
  }, [])
  
  return (
    <div className="relative w-full">
      <canvas 
        ref={canvasRef} 
        className="w-full h-24 rounded-md bg-muted/30 cursor-pointer" 
        onClick={togglePlay}
      />
      <audio ref={audioRef} className="hidden" />
      
      <button
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
        onClick={togglePlay}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        )}
      </button>
    </div>
  )
} 