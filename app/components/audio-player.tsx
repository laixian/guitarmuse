'use client'

import { useEffect, useRef, useState } from 'react'
import { useAudioStore } from '../store/audio-store'

interface AudioPlayerProps {
  url: string
}

export const AudioPlayer = ({ url }: AudioPlayerProps) => {
  // 扩展音频存储的使用，添加时间区间选择相关功能
  const { 
    audioUrl, 
    isEditing,
    selectedTimeRange, 
    setSelectedTimeStart, 
    setSelectedTimeEnd,
    clearSelectedTimeRange,
    analysisResult
  } = useAudioStore()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [waveformData, setWaveformData] = useState<number[]>([])
  
  // 时间区间选择模式状态
  const [showRangeSelector, setShowRangeSelector] = useState(false)
  // 拖动状态
  const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null)
  // 拖动冷却期（防止拖动结束后立即触发点击事件）
  const [dragCooldown, setDragCooldown] = useState(false)
  
  // 引用
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const rangeSliderRef = useRef<HTMLDivElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  
  // 绘制真实的音频波形
  const drawWaveform = () => {
    if (!canvasRef.current || !waveformData.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 获取画布宽高
    const width = canvas.width;
    const height = canvas.height;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 设置波形样式
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.6)';  // 波形颜色 (柔和的蓝紫色)
    ctx.fillStyle = 'rgba(165, 180, 252, 0.3)';   // 填充色 (柔和的淡蓝色)
    
    // 开始绘制
    ctx.beginPath();
    
    // 计算每个采样点在画布中的位置
    const sliceWidth = width / waveformData.length;
    
    // 从左下角开始绘制
    ctx.moveTo(0, height);
    
    // 绘制波形的顶部线条
    for (let i = 0; i < waveformData.length; i++) {
      const x = i * sliceWidth;
      const y = height - (waveformData[i] * height); // 反转Y轴，让波形向上
      ctx.lineTo(x, y);
    }
    
    // 绘制波形的底部线条（形成闭合区域）
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    
    // 填充波形
    ctx.fill();
    
    // 绘制波形轮廓
    ctx.stroke();
  };
  
  // 提取音频波形数据
  const extractWaveformData = async (audioUrl: string) => {
    try {
      // 创建一个Web Audio上下文
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      
      // 加载音频文件
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      
      // 解码音频数据
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // 从音频缓冲区获取左声道数据
      const channelData = audioBuffer.getChannelData(0);
      
      // 我们需要降采样数据以获得合理数量的点
      const samplesCount = 500; // 我们想要的采样点数量
      const blockSize = Math.floor(channelData.length / samplesCount);
      const sampledData = [];
      
      // 获取每个块的平均值
      for (let i = 0; i < samplesCount; i++) {
        let blockStart = i * blockSize;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[blockStart + j] || 0);
        }
        sampledData.push(sum / blockSize);
      }
      
      // 对数据进行归一化处理
      const multiplier = 0.8; // 控制波形高度（1.0是最大高度）
      let maxValue = Math.max(...sampledData) || 1;
      const normalizedData = sampledData.map(s => s / maxValue * multiplier);
      
      setWaveformData(normalizedData);
      return normalizedData;
    } catch (err) {
      console.error('提取波形数据失败:', err);
      return [];
    }
  };
  
  // 组件加载时初始化音频
  useEffect(() => {
    console.log("AudioPlayer组件挂载，audioUrl:", audioUrl)
    
    if (!audioUrl || !audioRef.current) return
    
    const audio = audioRef.current
    
    // 设置音频源
    audio.src = audioUrl
    audio.load()
    
    // 事件处理
    const handleLoadedMetadata = () => {
      console.log("音频元数据加载完成, 时长:", audio.duration)
      setDuration(audio.duration)
      setIsLoading(false)
    }
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }
    
    const handlePlay = () => {
      console.log("音频开始播放")
      setIsPlaying(true)
    }
    
    const handlePause = () => {
      console.log("音频暂停")
      setIsPlaying(false)
    }
    
    const handleEnded = () => {
      console.log("音频播放结束")
      setIsPlaying(false)
      setCurrentTime(0)
    }
    
    const handleCanPlayThrough = () => {
      console.log("音频可以流畅播放")
      setIsLoading(false)
    }
    
    const handleError = (e: Event) => {
      console.error("音频加载错误:", e)
      setIsLoading(false)
    }
    
    // 添加事件监听
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('canplaythrough', handleCanPlayThrough)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    
    // 提取并绘制波形
    extractWaveformData(audioUrl).then(() => {
      console.log('波形数据提取完成');
    });
    
    // 清理
    return () => {
      console.log("清理音频播放器")
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('canplaythrough', handleCanPlayThrough)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      
      audio.pause()
      audio.src = ''
      
      // 清理Web Audio API资源
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    }
  }, [audioUrl])
  
  // 当波形数据更新时绘制波形
  useEffect(() => {
    if (waveformData.length > 0) {
      drawWaveform();
    }
  }, [waveformData, showRangeSelector]);
  
  // 处理Canvas尺寸调整
  useEffect(() => {
    if (!canvasRef.current || !rangeSliderRef.current) return;
    
    const resizeCanvas = () => {
      if (!canvasRef.current || !rangeSliderRef.current) return;
      
      const container = rangeSliderRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      drawWaveform();
    };
    
    // 初始调整尺寸
    resizeCanvas();
    
    // 监听窗口尺寸变化
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [canvasRef.current, rangeSliderRef.current, waveformData, showRangeSelector]);
  
  // 处理窗口鼠标移动事件（拖动选区时）
  useEffect(() => {
    if (!isDragging || !rangeSliderRef.current || !duration || !selectedTimeRange) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = rangeSliderRef.current!.getBoundingClientRect();
      const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const newTime = (offsetX / rect.width) * duration;
      
      const MIN_RANGE = 1; // 最小范围为1秒
      
      if (isDragging === 'start') {
        // 调整开始时间，但确保与结束时间至少相差1秒
        const maxStartTime = selectedTimeRange.end !== null 
          ? Math.max(0, selectedTimeRange.end - MIN_RANGE) 
          : duration - MIN_RANGE;
        
        const newStart = Math.max(0, Math.min(newTime, maxStartTime));
        setSelectedTimeStart(newStart);
      } else if (isDragging === 'end') {
        // 调整结束时间，但确保与开始时间至少相差1秒
        const minEndTime = selectedTimeRange.start !== null 
          ? Math.min(duration, selectedTimeRange.start + MIN_RANGE) 
          : MIN_RANGE;
        
        const newEnd = Math.min(duration, Math.max(newTime, minEndTime));
        setSelectedTimeEnd(newEnd);
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(null);
      // 设置拖动冷却期，防止触发点击事件
      setDragCooldown(true);
      setTimeout(() => {
        setDragCooldown(false);
      }, 200); // 200ms冷却期
    };
    
    // 添加全局事件监听
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, rangeSliderRef, duration, selectedTimeRange, setSelectedTimeStart, setSelectedTimeEnd]);
  
  // 播放/暂停切换
  const togglePlayPause = () => {
    if (!audioRef.current || isLoading) return
    
    console.log("切换播放/暂停状态")
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      // 添加错误处理
      audioRef.current.play().catch(err => {
        console.error("播放失败:", err)
        setIsPlaying(false)
      })
    }
  }
  
  // 拖动进度条
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return
    
    const newTime = parseFloat(e.target.value)
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }
  
  // 处理区间选择器点击，设置开始时间
  const handleRangeSelectorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rangeSliderRef.current || !duration) return;
    
    // 如果正在拖动或处于拖动冷却期，不处理点击
    if (isDragging || dragCooldown) return;
    
    const rect = rangeSliderRef.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const clickRatio = offsetX / rect.width;
    const clickTime = clickRatio * duration;
    
    // 如果已经有完整区间或者没有选择任何区间，则重新开始选择
    if (!selectedTimeRange || selectedTimeRange.start === null || selectedTimeRange.end !== null) {
      const startTime = clickTime;
      // 自动设置结束时间为开始时间+10秒(或结束时间)
      const endTime = Math.min(duration, startTime + 10);
      
      setSelectedTimeStart(startTime);
      // 短暂延迟设置结束时间，避免UI渲染问题
      setTimeout(() => {
        setSelectedTimeEnd(endTime);
      }, 50);
    } else {
      // 调整结束时间
      if (clickTime < selectedTimeRange.start) {
        // 如果点击位置在开始时间之前，则交换开始和结束
        setSelectedTimeEnd(selectedTimeRange.start);
        setSelectedTimeStart(clickTime);
      } else {
        setSelectedTimeEnd(clickTime);
      }
    }
  };
  
  // 开始拖动选区
  const handleStartDrag = (e: React.MouseEvent, handle: 'start' | 'end') => {
    e.stopPropagation(); // 防止触发选区点击
    setIsDragging(handle);
  };
  
  // 确认选择区间
  const confirmTimeRange = () => {
    // 如果只选了开始没选结束，使用当前时间作为结束
    if (selectedTimeRange && selectedTimeRange.start !== null && selectedTimeRange.end === null) {
      setSelectedTimeEnd(Math.min(duration, selectedTimeRange.start + 10));
    }
    setShowRangeSelector(false);
  };
  
  // 取消选择区间
  const cancelTimeRange = () => {
    clearSelectedTimeRange();
    setShowRangeSelector(false);
  };
  
  // 格式化时间显示
  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity || time === 0) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // 如果没有音频URL，不渲染任何内容
  if (!audioUrl) return null;
  
  return (
    <div className="space-y-4">
      {/* 主播放器 */}
      <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4 relative">
        {/* 隐藏的音频元素 */}
        <audio ref={audioRef} preload="auto" />
        
        {/* 加载状态指示器 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
            <p className="text-gray-500">加载音频中...</p>
          </div>
        )}
        
        {/* 控制栏 */}
        <div className="flex items-center mb-4">
          <button
            onClick={togglePlayPause}
            disabled={isLoading}
            className={`p-2 rounded-full ${
              isLoading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
            } transition-colors`}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
          
          <div className="text-sm text-gray-600 ml-3">
            {formatTime(currentTime)}
          </div>
          
          {/* 编辑模式下显示时间区间选择按钮 */}
          {isEditing && (
            <div className="ml-auto">
              <button
                onClick={() => {
                  setShowRangeSelector(!showRangeSelector);
                  if (!showRangeSelector) {
                    clearSelectedTimeRange();
                  }
                }}
                className={`text-xs px-2 py-1 rounded ${
                  showRangeSelector 
                    ? 'bg-purple-200 text-purple-800' 
                    : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
              >
                {showRangeSelector ? '收起区间选择器' : '选择时间区间'}
              </button>
            </div>
          )}
        </div>
        
        {/* 进度条 */}
        <div className="flex items-center">
          <div 
            ref={progressRef}
            className="relative flex-1 h-3 bg-gray-200 rounded-full overflow-hidden"
          >
            {/* 播放进度 */}
            <div 
              className="absolute h-full bg-purple-500 rounded-full"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime || 0}
              onChange={handleSeek}
              className="absolute w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading || duration === 0}
            />
          </div>
          
          <div className="text-sm text-gray-600 ml-3 w-12 text-right">
            {formatTime(duration)}
          </div>
        </div>
      </div>
      
      {/* 时间区间选择器 (仅在编辑模式且选择器打开时显示) */}
      {isEditing && showRangeSelector && (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-4">
          <div className="mb-3 flex justify-between items-center">
            <h3 className="text-sm font-medium text-gray-700">选择时间区间</h3>
            <div className="flex space-x-2">
              <button
                onClick={confirmTimeRange}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                disabled={!selectedTimeRange || selectedTimeRange.start === null}
              >
                确认选择
              </button>
              <button
                onClick={cancelTimeRange}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                取消选择
              </button>
            </div>
          </div>
          
          {/* 区间选择器 */}
          <div className="space-y-4">
            {/* 选择器指示文字 */}
            <div className="text-xs text-gray-500">
              {!selectedTimeRange || selectedTimeRange.start === null ? (
                <p>点击下方波形选择时间区间（将自动生成10秒区间）</p>
              ) : selectedTimeRange.end === null ? (
                <p>请再次点击以选择结束时间</p>
              ) : (
                <p>已选择区间: {formatTime(selectedTimeRange.start)} - {formatTime(selectedTimeRange.end)} (可拖动两侧调整区间)</p>
              )}
            </div>
            
            {waveformData.length === 0 && (
              <div className="text-xs text-gray-500 mb-2">
                <p>正在加载音频波形...</p>
              </div>
            )}
            
            {/* 时间线和选择区域 - 使用Canvas显示真实波形 */}
            <div 
              ref={rangeSliderRef}
              className="relative h-24 bg-gray-100 rounded-md cursor-pointer overflow-hidden"
              onClick={handleRangeSelectorClick}
            >
              {/* 真实波形Canvas */}
              <canvas 
                ref={canvasRef}
                className="absolute inset-0 w-full h-full z-0"
              />
              
              {/* 时间刻度线 */}
              <div className="absolute w-full h-full flex z-10">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex-1 border-r border-gray-300 relative">
                    <span className="absolute bottom-0 left-0 text-xs text-gray-700 bg-gray-100 px-1 rounded z-20">
                      {formatTime(duration * (i / 10))}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* 当前播放位置指示器 */}
              <div
                className="absolute h-full w-0.5 bg-purple-600 z-10"
                style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              />
              
              {/* 选定区间高亮 */}
              {selectedTimeRange && selectedTimeRange.start !== null && (
                <div 
                  className="absolute h-full bg-yellow-400 opacity-30 z-10"
                  style={{
                    left: `${(selectedTimeRange.start / duration) * 100}%`,
                    width: `${((selectedTimeRange.end !== null ? selectedTimeRange.end : currentTime) - selectedTimeRange.start) / duration * 100}%`
                  }}
                >
                  {/* 左侧拖动把手 */}
                  <div 
                    className={`absolute left-0 top-0 bottom-0 w-3 bg-yellow-600 opacity-60 cursor-col-resize z-20 ${isDragging === 'start' ? 'opacity-90' : ''}`}
                    onMouseDown={(e) => handleStartDrag(e, 'start')}
                    title="拖动调整开始时间"
                  />
                  
                  {/* 右侧拖动把手 */}
                  {selectedTimeRange.end !== null && (
                    <div 
                      className={`absolute right-0 top-0 bottom-0 w-3 bg-yellow-600 opacity-60 cursor-col-resize z-20 ${isDragging === 'end' ? 'opacity-90' : ''}`}
                      onMouseDown={(e) => handleStartDrag(e, 'end')}
                      title="拖动调整结束时间"
                    />
                  )}
                </div>
              )}
            </div>
            
            {/* 选定时间显示 */}
            <div className="flex justify-between text-sm">
              <div>
                开始: {selectedTimeRange && selectedTimeRange.start !== null ? formatTime(selectedTimeRange.start) : "--:--"}
              </div>
              <div>
                结束: {selectedTimeRange && selectedTimeRange.end !== null ? formatTime(selectedTimeRange.end) : "--:--"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 