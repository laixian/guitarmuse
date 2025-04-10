'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useAudioStore } from '../store/audio-store'
import { Measure } from '../types/audio'

// 生成调性的顺阶和弦
function generateDiatonicChords(key: string): string[] {
  // 所有音符
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const flatNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  
  // 大调音阶间隔: W-W-H-W-W-W-H (全全半全全全半)
  const majorIntervals = [0, 2, 4, 5, 7, 9, 11];
  
  // 自然小调音阶间隔: W-H-W-W-H-W-W
  const minorIntervals = [0, 2, 3, 5, 7, 8, 10];
  
  // 标准化调性名称：移除major后缀，将minor转换为m后缀
  let normalizedKey = key;
  if (key.endsWith(' major')) {
    normalizedKey = key.replace(/ major$/, '');
  } else if (key.endsWith(' minor')) {
    normalizedKey = key.replace(/ minor$/, 'm');
  } else if (key.endsWith('min')) {
    normalizedKey = key.replace(/min$/, 'm');
  } else if (key.endsWith('maj')) {
    normalizedKey = key.replace(/maj$/, '');
  }
  
  // 分析调性
  let rootNote = normalizedKey.replace(/m$/, ''); // 去掉可能的小调标记
  let isMinor = normalizedKey.endsWith('m');
  let useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(rootNote) || 
                ['Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'].includes(normalizedKey);
  
  // 处理特殊情况: 如果是升或降号
  if (rootNote.includes('#') || rootNote.includes('b')) {
    // 统一处理成索引
    const noteArray = rootNote.includes('b') ? flatNotes : notes;
    rootNote = rootNote.replace(/[#b]/, '');
    const baseIndex = noteArray.indexOf(rootNote);
    if (baseIndex === -1) return []; // 无效的根音
    
    const accidental = normalizedKey.includes('#') ? '#' : 'b';
    rootNote = rootNote + accidental;
  }
  
  // 找到根音在音符数组中的索引
  const noteArray = useFlats ? flatNotes : notes;
  const rootIndex = noteArray.indexOf(rootNote);
  if (rootIndex === -1) return []; // 无效的根音
  
  // 选择音阶间隔
  const intervals = isMinor ? minorIntervals : majorIntervals;
  
  // 生成音阶音符
  const scaleNotes = intervals.map(interval => {
    const index = (rootIndex + interval) % 12;
    return noteArray[index];
  });
  
  // 大调和小调的和弦类型数组
  const majorChordTypes = ['', 'm', 'm', '', '', 'm', 'dim'];
  const minorChordTypes = ['m', 'dim', '', 'm', 'm', '', ''];
  
  // 根据调性选择和弦类型
  const chordTypes = isMinor ? minorChordTypes : majorChordTypes;
  
  // 生成顺阶和弦
  return scaleNotes.map((note, i) => `${note}${chordTypes[i]}`);
}

// 生成常用的和弦变化
function generateCommonVariations(diatonicChords: string[]): string[][] {
  return diatonicChords.map(baseChord => {
    const [root, type = ''] = baseChord.match(/([A-G][#b]?)(.*)/)?.slice(1) || [];
    if (!root) return [baseChord];
    
    const variations = [baseChord]; // 基础和弦
    
    // 根据基础和弦类型添加常见变化
    if (type === '') {
      // 大三和弦的变化
      variations.push(`${root}7`, `${root}maj7`, `${root}6`, `${root}9`, `${root}sus4`);
    } else if (type === 'm') {
      // 小三和弦的变化
      variations.push(`${root}m7`, `${root}m9`, `${root}m6`);
    } else if (type === 'dim') {
      // 减三和弦的变化
      variations.push(`${root}dim7`, `${root}m7b5`);
    }
    
    return variations;
  });
}

interface ChordEditDialogProps {
  measure: Measure | null
  onClose: () => void
  onSave: (chordName: string) => void
}

export const ChordEditDialog = ({ measure, onClose, onSave }: ChordEditDialogProps) => {
  const { analysisResult } = useAudioStore();
  const [selectedChord, setSelectedChord] = useState<string>('')
  const [customChord, setCustomChord] = useState<string>('')
  const [useCustomChord, setUseCustomChord] = useState<boolean>(false)
  
  // 获取当前调性并标准化格式
  const rawKey = analysisResult?.key || 'C';
  const currentKey = useMemo(() => {
    // 标准化调性格式
    if (rawKey.endsWith(' major')) return rawKey.replace(/ major$/, '');
    if (rawKey.endsWith(' minor')) return rawKey.replace(/ minor$/, 'm');
    if (rawKey.endsWith('min')) return rawKey.replace(/min$/, 'm');
    if (rawKey.endsWith('maj')) return rawKey.replace(/maj$/, '');
    return rawKey;
  }, [rawKey]);
  
  // 生成顺阶和弦及其变化形式
  const diatonicChords = useMemo(() => generateDiatonicChords(currentKey), [currentKey]);
  const chordGroups = useMemo(() => generateCommonVariations(diatonicChords), [diatonicChords]);
  
  // 生成顺阶和弦的罗马数字表示
  const romanNumerals = useMemo(() => {
    const majorNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
    const minorNumerals = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
    return currentKey.endsWith('m') ? minorNumerals : majorNumerals;
  }, [currentKey]);
  
  // 当measure变化时，初始化选中的和弦
  useEffect(() => {
    if (measure) {
      setSelectedChord(measure.chord)
      setCustomChord(measure.chord)
      
      // 判断是否为顺阶和弦或其变化
      const isCommon = chordGroups.some(group => 
        group.some(chord => chord === measure.chord)
      );
      setUseCustomChord(!isCommon)
    }
  }, [measure, chordGroups])
  
  // 处理保存
  const handleSave = () => {
    const chordToSave = useCustomChord ? customChord : selectedChord
    if (chordToSave) {
      onSave(chordToSave)
    }
  }
  
  // 如果没有传入measure，不显示
  if (!measure) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 className="text-xl font-semibold mb-4">修改和弦</h3>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-1">当前和弦: <span className="font-mono font-bold">{measure.chord}</span></p>
          <p className="text-gray-700 mb-1">小节编号: #{measure.number}</p>
          <p className="text-gray-700 mb-1">当前调性: <span className="font-semibold">{currentKey}</span></p>
          {measure.barSpan && measure.barSpan > 1 && (
            <p className="text-gray-700">跨越小节数: {measure.barSpan}</p>
          )}
        </div>
        
        <div className="mb-4">
          <label className="flex items-center space-x-2 mb-2">
            <input
              type="radio"
              checked={!useCustomChord}
              onChange={() => setUseCustomChord(false)}
              className="accent-indigo-600"
            />
            <span>选择顺阶和弦</span>
          </label>
          
          {!useCustomChord && (
            <div className="grid grid-cols-7 gap-2 mt-2">
              {chordGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="flex flex-col space-y-2">
                  <div className="text-xs text-center bg-gray-100 rounded-md py-1 font-semibold">
                    {romanNumerals[groupIndex]}
                  </div>
                  {group.map(chord => (
                    <button
                      key={chord}
                      onClick={() => setSelectedChord(chord)}
                      className={`
                        py-1 px-2 rounded text-sm font-mono
                        ${selectedChord === chord 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
                      `}
                    >
                      {chord}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label className="flex items-center space-x-2 mb-2">
            <input
              type="radio"
              checked={useCustomChord}
              onChange={() => setUseCustomChord(true)}
              className="accent-indigo-600"
            />
            <span>输入自定义和弦</span>
          </label>
          
          {useCustomChord && (
            <input
              type="text"
              value={customChord}
              onChange={(e) => setCustomChord(e.target.value)}
              placeholder="输入和弦名称 (例如: Cmaj7)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          )}
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

// 独立版本，通过事件触发
export const StandaloneChordEditDialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentMeasure, setCurrentMeasure] = useState<Measure | null>(null)
  const { updateMeasureChord, updateBarChord } = useAudioStore()
  
  // 监听打开和弦编辑对话框的事件
  useEffect(() => {
    const handleOpenDialog = (e: CustomEvent<{ measure: Measure }>) => {
      setCurrentMeasure(e.detail.measure)
      setIsOpen(true)
    }
    
    window.addEventListener('open-chord-edit-dialog', handleOpenDialog as EventListener)
    return () => {
      window.removeEventListener('open-chord-edit-dialog', handleOpenDialog as EventListener)
    }
  }, [])
  
  const handleClose = () => {
    setIsOpen(false)
    setCurrentMeasure(null)
  }
  
  const handleSave = (chordName: string) => {
    if (!currentMeasure) return
    
    // 判断是使用barNumber还是measureId来更新和弦
    if ('barNumber' in currentMeasure && typeof currentMeasure.barNumber === 'number') {
      updateBarChord(currentMeasure.barNumber, chordName)
    } else if (currentMeasure.id) {
      updateMeasureChord(currentMeasure.id, chordName)
    }
    
    // 关闭对话框
    setIsOpen(false)
    setCurrentMeasure(null)
  }
  
  if (!isOpen || !currentMeasure) return null
  
  return (
    <ChordEditDialog
      measure={currentMeasure}
      onClose={handleClose}
      onSave={handleSave}
    />
  )
} 