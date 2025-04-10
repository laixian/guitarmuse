'use client'

import { useState, useRef } from 'react'
import { useAudioStore } from '../store/audio-store'
import { SectionType, Measure } from '../types/audio'
import { chordToNumeric } from '../lib/chord-utils'

// 可用的段落类型
const SECTION_TYPES: SectionType[] = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Solo', 'Outro']

// 可用的调性
const KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Am', 'A#m', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
]

// 常用和弦
const COMMON_CHORDS = {
  'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim'],
  'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'],
  'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'C#dim'],
  'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'G#dim'],
  'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'D#dim'],
  'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'Edim'],
  'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'],
  'Em': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D'],
  'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C']
}

// 添加检测重复和弦模式的函数
const findRepeatingChordPatterns = (measures: Measure[]): {
  repetitionCount: number
} => {
  // 如果小节少于4个，不考虑重复模式
  if (measures.length < 4) {
    return { repetitionCount: 1 };
  }
  
  // 尝试不同的模式长度
  for (let patternLength = Math.floor(measures.length / 2); patternLength >= 2; patternLength--) {
    if (measures.length % patternLength === 0) {
      const possiblePattern = measures.slice(0, patternLength);
      let isRepeating = true;
      
      // 检查后续的每个模式是否与第一个模式相同
      for (let i = 1; i < measures.length / patternLength; i++) {
        const currentSegment = measures.slice(i * patternLength, (i + 1) * patternLength);
        
        // 检查和弦是否匹配
        for (let j = 0; j < patternLength; j++) {
          if (possiblePattern[j].chord !== currentSegment[j].chord) {
            isRepeating = false;
            break;
          }
        }
        
        if (!isRepeating) break;
      }
      
      if (isRepeating) {
        return {
          repetitionCount: measures.length / patternLength
        };
      }
    }
  }
  
  // 没有找到重复模式
  return { repetitionCount: 1 };
};

export const AnalysisEditor = () => {
  const { 
    analysisResult, 
    isEditing, 
    hasUserEdits,
    selectedTimeRange,
    toggleEditMode, 
    updateAnalysisKey, 
    updateAnalysisTempo,
    updateStructure,
    addStructure,
    removeStructure,
    updateMeasure,
    addMeasure,
    removeMeasure,
    resetAnalysis,
    duplicateStructure,
    reorderStructures,
    createStructureFromTimeRange
  } = useAudioStore()
  
  // 段落展开状态
  const [expandedSections, setExpandedSections] = useState<{[key: number]: boolean}>({0: true})
  
  // 拖拽状态
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const draggedNode = useRef<HTMLDivElement | null>(null)
  
  // 时间区间选择状态
  const hasSelectedTimeRange = selectedTimeRange && 
                             selectedTimeRange.start !== null && 
                             selectedTimeRange.end !== null;
  
  // 创建时间区间段落的弹出菜单状态
  const [showSectionTypeMenu, setShowSectionTypeMenu] = useState(false);
  
  if (!analysisResult) return null
  
  // 处理展开/折叠段落
  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }
  
  // 获取当前调性的推荐和弦
  const getRecommendedChords = () => {
    const key = analysisResult.key
    return COMMON_CHORDS[key as keyof typeof COMMON_CHORDS] || COMMON_CHORDS['C']
  }
  
  // 拖拽处理函数
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (!isEditing) return
    
    // 设置拖拽数据
    setDraggedIndex(index)
    draggedNode.current = e.currentTarget
    
    // 设置拖拽效果
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    
    // 添加拖拽时的样式
    setTimeout(() => {
      if (draggedNode.current) {
        draggedNode.current.style.opacity = '0.5'
      }
    }, 0)
  }
  
  const handleDragEnd = () => {
    if (!isEditing) return
    
    // 重置拖拽状态
    setDraggedIndex(null)
    
    // 移除拖拽样式
    if (draggedNode.current) {
      draggedNode.current.style.opacity = '1'
      draggedNode.current = null
    }
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isEditing) return
    
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    if (!isEditing || draggedIndex === null) return
    
    e.preventDefault()
    
    // 执行段落重排序
    reorderStructures(draggedIndex, toIndex)
  }
  
  return (
    <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">分析结果{hasUserEdits ? ' (已编辑)' : ''}</h3>
        
        <div className="flex space-x-2">
          {hasUserEdits && (
            <button
              onClick={resetAnalysis}
              className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
            >
              重置
            </button>
          )}
          
          <button
            onClick={toggleEditMode}
            className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
          >
            {isEditing ? '完成编辑' : '编辑分析'}
          </button>
        </div>
      </div>
      
      {/* 基本信息 */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-gray-50 rounded-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">调性</label>
          {isEditing ? (
            <select 
              value={analysisResult.key}
              onChange={(e) => updateAnalysisKey(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              {KEYS.map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
          ) : (
            <div className="p-2 bg-white border border-gray-200 rounded-md">
              {analysisResult.key}
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">速度 (BPM)</label>
          {isEditing ? (
            <input 
              type="number" 
              value={analysisResult.tempo}
              onChange={(e) => updateAnalysisTempo(Number(e.target.value))}
              min={40}
              max={220}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          ) : (
            <div className="p-2 bg-white border border-gray-200 rounded-md">
              {analysisResult.tempo} BPM
            </div>
          )}
        </div>

        {/* 节拍信息 */}
        {analysisResult.beats && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">节拍类型</label>
              <div className="p-2 bg-white border border-gray-200 rounded-md">
                {analysisResult.beats.timeSignature || "4/4"}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">每小节拍数</label>
              <div className="p-2 bg-white border border-gray-200 rounded-md">
                {analysisResult.beats.beatsPerBar || 4} 拍/小节
              </div>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">检测到的拍点数量</label>
              <div className="p-2 bg-white border border-gray-200 rounded-md">
                {analysisResult.beats.positions.length} 个拍点
                {analysisResult.beats.positions.length > 0 && (
                  <span className="text-xs text-gray-500 ml-2">
                    (第一拍: {analysisResult.beats.positions[0].toFixed(2)}s, 
                    最后拍: {analysisResult.beats.positions[analysisResult.beats.positions.length - 1].toFixed(2)}s)
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* 段落列表 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">歌曲结构</h4>
          <div className="flex space-x-2">
            {isEditing && hasSelectedTimeRange && (
              <div className="relative">
                <button
                  onClick={() => setShowSectionTypeMenu(!showSectionTypeMenu)}
                  className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 flex items-center"
                >
                  <span>创建选定区间段落</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {showSectionTypeMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                    <div className="py-1">
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                        选择段落类型
                      </div>
                      {SECTION_TYPES.map((type) => (
                        <button
                          key={type}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            createStructureFromTimeRange(type);
                            setShowSectionTypeMenu(false);
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {isEditing && (
              <button
                onClick={() => addStructure('Verse')}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                添加段落
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          {analysisResult.structures.map((structure, index) => {
            // 检测重复模式
            const { repetitionCount } = findRepeatingChordPatterns(structure.measures);
            
            return (
              <div 
                key={index} 
                className={`border border-gray-200 rounded-md overflow-hidden ${isEditing ? 'cursor-move' : ''}`}
                draggable={isEditing}
                onDragStart={(e) => isEditing && handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => isEditing && handleDragOver(e)}
                onDrop={(e) => isEditing && handleDrop(e, index)}
              >
                {/* 段落标题栏 */}
                <div 
                  className={`flex justify-between items-center p-3 ${isEditing ? 'bg-blue-50' : 'bg-gray-50'} ${draggedIndex === index ? 'border-2 border-blue-500' : ''}`}
                  onClick={() => toggleSection(index)}
                >
                  <div className="flex items-center">
                    <span className={`mr-2 ${expandedSections[index] ? 'transform rotate-90' : ''}`}>
                      ▶
                    </span>
                    {isEditing ? (
                      <select
                        value={structure.type}
                        onChange={(e) => updateStructure(index, { type: e.target.value as SectionType })}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2 p-1 border border-gray-300 rounded"
                      >
                        {SECTION_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium mr-2">
                        {structure.type}
                        {repetitionCount > 1 && !isEditing && (
                          <span className="text-sm font-normal ml-1 text-gray-500">
                            × {repetitionCount}
                          </span>
                        )}
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      {structure.startTime.toFixed(1)}s - {structure.endTime.toFixed(1)}s
                    </span>
                  </div>
                  
                  {isEditing && (
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateStructure(index)
                        }}
                        className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        title="复制段落"
                      >
                        复制
                      </button>
                      
                      {index > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            reorderStructures(index, index - 1)
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="上移"
                        >
                          ↑
                        </button>
                      )}
                      
                      {index < analysisResult.structures.length - 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            reorderStructures(index, index + 1)
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          title="下移"
                        >
                          ↓
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeStructure(index)
                        }}
                        className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        title="删除段落"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
                
                {/* 小节列表 */}
                {expandedSections[index] && (
                  <div className="p-3">
                    <div className="mb-2 flex justify-between items-center">
                      <h5 className="text-sm font-medium">小节和和弦</h5>
                      {isEditing && (
                        <button
                          onClick={() => addMeasure(index)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          添加小节
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {structure.measures.map((measure, mIndex) => {
                        // 获取当前和弦
                        const currentChord = measure.chord;
                        
                        // 转换为级数表示法
                        const numericDegree = chordToNumeric(currentChord, analysisResult.key);
                        
                        return (
                          <div key={mIndex} className="flex items-center p-2 bg-gray-50 rounded">
                            {/* 隐藏小节编号 */}
                            
                            <div className="flex-1">
                              {isEditing ? (
                                <select
                                  value={measure.chord}
                                  onChange={(e) => updateMeasure(index, mIndex, { chord: e.target.value })}
                                  className="w-full p-1 border border-gray-300 rounded"
                                >
                                  <optgroup label="推荐和弦">
                                    {getRecommendedChords().map(chord => (
                                      <option key={chord} value={chord}>{chord}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label="所有和弦">
                                    {Object.values(COMMON_CHORDS).flat().filter(
                                      (chord, i, arr) => arr.indexOf(chord) === i
                                    ).map(chord => (
                                      <option key={chord} value={chord}>{chord}</option>
                                    ))}
                                  </optgroup>
                                </select>
                              ) : (
                                <div className="px-3 py-1 bg-white border border-gray-200 rounded relative group">
                                  <span className="cursor-help font-mono text-lg font-bold tracking-wide" title={currentChord}>
                                    {numericDegree || '-'}
                                  </span>
                                  
                                  {/* 悬停时显示原始和弦名称 */}
                                  <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-sans">
                                    {currentChord}
                                  </span>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-2 text-xs text-gray-500">
                              {measure.startTime.toFixed(1)}s - {measure.endTime.toFixed(1)}s
                            </div>
                            
                            {isEditing && (
                              <button
                                onClick={() => removeMeasure(index, mIndex)}
                                className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 时间选择区间提示 */}
      {isEditing && hasSelectedTimeRange && (
        <div className="text-xs text-gray-500 mt-2 p-2 bg-yellow-50 rounded mb-4">
          已选定时间区间: {formatTime(selectedTimeRange.start!)} - {formatTime(selectedTimeRange.end!)}，
          点击"创建选定区间段落"按钮可以基于该区间创建新的段落。
        </div>
      )}
      
      {/* 拖放提示 */}
      {isEditing && (
        <div className="text-xs text-gray-500 mt-4 p-2 bg-blue-50 rounded mb-4">
          提示：您可以拖动段落标题来改变段落顺序，或使用↑↓按钮移动段落。点击"复制"按钮可复制整个段落。
        </div>
      )}
      
      {/* 提示信息 */}
      {isEditing && (
        <div className="text-xs text-gray-500 mt-4 p-2 bg-yellow-50 rounded">
          提示：音频分析可能不是100%准确，您可以根据需要手动调整分析结果。修改调性会影响和弦推荐。
        </div>
      )}
    </div>
  )
  
  // 格式化时间函数
  function formatTime(time: number) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
} 