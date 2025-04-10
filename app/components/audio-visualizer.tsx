'use client'

import { useEffect, useRef, useState } from 'react'

interface AudioVisualizerProps {
  url: string
}

export const AudioVisualizer = ({ url }: AudioVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  // @ts-ignore
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    audio.src = url
    audio.load()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [url])

  const visualize = () => {
    const canvas = canvasRef.current
    const audio = audioRef.current
    if (!canvas || !audio) return

    // @ts-ignore
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' })
    const analyser = audioContext.createAnalyser()
    const source = audioContext.createMediaElementSource(audio)

    source.connect(analyser)
    analyser.connect(audioContext.destination)

    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      animationFrameRef.current = requestAnimationFrame(draw)

      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgb(0, 0, 0)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2

        ctx.fillStyle = `rgb(${barHeight + 100},50,50)`
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)

        x += barWidth + 1
      }
    }

    draw()
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(error => {
        console.error('播放音频时出错:', error)
      })
      visualize()
    }
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-white rounded-lg shadow-md">
      <audio ref={audioRef} />
      <canvas
        ref={canvasRef}
        width={800}
        height={200}
        className="w-full h-48 bg-black rounded-lg"
      />
      <button
        onClick={togglePlay}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        {isPlaying ? '暂停' : '播放'}
      </button>
    </div>
  )
} 