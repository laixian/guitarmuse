'use client'

import React, { useEffect, useCallback, useMemo, useState } from 'react'
import { useAudioStore } from '../store/audio-store'
import { Measure, SectionType, SongStructure } from '../types/audio'
import { chordToNumeric, normalizeKey } from '../lib/chord-utils'
import { EditToolbar } from './edit-toolbar'
import { SectionDialog } from './section-dialog'
import { StandaloneChordEditDialog } from './chord-edit-dialog'
import { ImageExport } from './pdf-export'
import { motion, AnimatePresence } from 'framer-motion'

// 段落类型对应的颜色
const sectionColors: Record<SectionType, string> = {
  'Intro': 'bg-blue-100 border-blue-300 text-blue-800',
  'Verse': 'bg-purple-100 border-purple-300 text-purple-800',
  'Chorus': 'bg-red-100 border-red-300 text-red-800',
  'Bridge': 'bg-yellow-100 border-yellow-300 text-yellow-800',
  'Solo': 'bg-green-100 border-green-300 text-green-800',
  'Outro': 'bg-gray-100 border-gray-300 text-gray-800',
  'Any': 'bg-gray-50 border-gray-200 text-gray-600'
}

// 获取段落类型的颜色样式
const getSectionColorClass = (type: SectionType): string => {
  return sectionColors[type] || 'bg-gray-50 border-gray-200 text-gray-600'
}

// 新增引导浮窗组件
const GuideTip = ({ isVisible, onClose, onEnterEditMode }: { isVisible: boolean; onClose: () => void; onEnterEditMode: () => void }) => {
  if (!isVisible) return null;
  
  const tips = [
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
        </svg>
      ),
      title: '规划段落结构',
      description: '点击"编辑"按钮进入编辑模式，选择小节后可以创建段落'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
        </svg>
      ),
      title: '纠正和弦标记',
      description: '选择编辑模式中的和弦工具，点击小节可修改错误的和弦'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      ),
      title: '删除多余小节',
      description: '使用框选工具选择小节，然后按Delete键删除不需要的内容'
    },
    {
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      ),
      title: '导出谱表图片',
      description: '点击右上角的导出按钮，将生成的功能谱保存为高质量图片'
    }
  ];
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative max-w-4xl w-full mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* 顶部渐变条 */}
          <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500"></div>
          
          <div className="p-6 md:p-8">
            {/* 标题和关闭按钮 */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">分析完成，开始编辑吧！</h2>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="关闭提示"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* 引导描述 */}
            <p className="text-gray-600 mb-8">
              我们已完成对您的音频的基础分析。下面是一些可以帮助您优化谱表的操作指南：
            </p>
            
            {/* 操作提示卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {tips.map((tip, index) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={tip.title} 
                  className="bg-gray-50 p-4 rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex">
                    <div className="flex-shrink-0 mr-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        {tip.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-800 mb-1">{tip.title}</h3>
                      <p className="text-gray-600 text-sm">{tip.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* 操作按钮区域 */}
            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-full font-medium shadow-sm hover:shadow transition-shadow"
              >
                稍后再说
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onEnterEditMode}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full font-medium shadow-md hover:shadow-lg transition-shadow flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                开始编辑
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export const ChordChart = () => {
  const { 
    analysisResult, 
    isEditMode, 
    currentTool, 
    selection, 
    clearSelection,
    startSelection,
    updateSelection,
    endSelection,
    selectMeasure,
    removeSection,
    toggleEditMode,
    updateSongTitle,
    removeBarFromSection,
    barsPerRow
  } = useAudioStore()
  
  // 添加提示显示状态
  const [showEditTip, setShowEditTip] = React.useState(true)
  // 添加编辑按钮引用
  const editButtonRef = React.useRef<HTMLButtonElement>(null)
  
  // 新增状态控制引导浮窗的显示
  const [showGuide, setShowGuide] = useState(false)
  // 新增状态控制编辑模式引导的显示
  const [showEditGuide, setShowEditGuide] = useState(false)
  
  // 在分析结果加载后显示引导浮窗
  useEffect(() => {
    if (analysisResult) {
      // 检查是否已经显示过引导
      const hasSeenGuide = localStorage.getItem('hasSeenChordGuide') === 'true'
      
      if (!hasSeenGuide) {
        // 延迟显示引导，让用户先看到分析结果
        const timer = setTimeout(() => {
          setShowGuide(true)
        }, 1000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [analysisResult])
  
  // 监听编辑模式状态变化
  useEffect(() => {
    if (isEditMode) {
      // 检查是否已经显示过编辑模式引导
      const hasSeenEditGuide = localStorage.getItem('hasSeenEditGuide') === 'true'
      
      if (!hasSeenEditGuide && !showGuide) { // 确保主引导不在显示时才显示编辑引导
        setShowEditGuide(true)
        
        // 5秒后自动关闭引导
        const timer = setTimeout(() => {
          setShowEditGuide(false)
          localStorage.setItem('hasSeenEditGuide', 'true')
        }, 5000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [isEditMode, showGuide])
  
  // 关闭引导并记录状态
  const handleCloseGuide = () => {
    setShowGuide(false)
    localStorage.setItem('hasSeenChordGuide', 'true')
    
    // 在关闭主引导后，如果用户是首次进入编辑模式，则显示编辑模式引导
    if (isEditMode && localStorage.getItem('hasSeenEditGuide') !== 'true') {
      setShowEditGuide(true)
    }
  }
  
  // 关闭编辑模式引导
  const handleCloseEditGuide = () => {
    setShowEditGuide(false)
    localStorage.setItem('hasSeenEditGuide', 'true')
  }
  
  // 处理点击编辑按钮
  const handleEditClick = () => {
    toggleEditMode()
  }
  
  // 从引导浮窗直接进入编辑模式
  const handleEnterEditModeFromGuide = () => {
    // 先关闭引导
    setShowGuide(false)
    localStorage.setItem('hasSeenChordGuide', 'true')
    
    // 然后打开编辑模式
    if (!isEditMode) {
      toggleEditMode()
    }
    
    // 将编辑模式引导设置为已显示
    localStorage.setItem('hasSeenEditGuide', 'true')
  }
  
  if (!analysisResult) {
    return null
  }
  
  // 从原始数据中解析关键信息
  const rawData = analysisResult.raw_data || {}
  const rootKey = rawData['root key'] || analysisResult.key
  const bpm = rawData['bpm'] || analysisResult.tempo
  const chordsMap = rawData['chords map'] || []
  const beatMap = rawData['beat map'] || []
  
  // 歌曲标题编辑状态
  const [isEditingTitle, setIsEditingTitle] = React.useState(false)
  const [titleValue, setTitleValue] = React.useState(analysisResult.songTitle || '未命名歌曲')
  
  // 当analysisResult.songTitle变化时更新本地状态
  React.useEffect(() => {
    setTitleValue(analysisResult.songTitle || '未命名歌曲')
  }, [analysisResult.songTitle])
  
  // 处理标题编辑
  const handleTitleClick = () => {
    if (isEditMode) {
      setIsEditingTitle(true)
    }
  }
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitleValue(e.target.value)
  }
  
  const handleTitleBlur = () => {
    setIsEditingTitle(false)
    updateSongTitle(titleValue)
  }
  
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsEditingTitle(false)
      updateSongTitle(titleValue)
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false)
      setTitleValue(analysisResult.songTitle || '未命名歌曲')
    }
  }
  
  // 标准化调性
  const normalizedKey = useMemo(() => normalizeKey(rootKey), [rootKey])
  
  // 计算总小节数量
  const totalBars = useMemo(() => {
    if (!chordsMap || chordsMap.length === 0) return 0
    
    // 找到最后一个和弦的end_bar作为总小节数
    let maxBar = 0
    chordsMap.forEach((chord: any) => {
      if (chord.end_bar && chord.end_bar > maxBar) {
        maxBar = chord.end_bar
      }
    })
    
    return maxBar
  }, [chordsMap])
  
  // 处理键盘事件
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    console.log(`按键被按下: ${event.key}`); // 添加调试日志
    
    if (event.key === 'Escape') {
      clearSelection()
    } 
    else if (event.key === 'e' && event.ctrlKey) {
      // Ctrl+E 开关编辑模式
      toggleEditMode()
      event.preventDefault()
    }
    else if ((event.key === 'Delete' || event.key === 'Backspace') && isEditMode) {
      // 在编辑模式下，按Delete键或Backspace键删除选中的小节
      console.log('删除键被按下，选中的小节:', selection.selectedMeasureIds);
      if (selection.selectedMeasureIds.length === 1) {
        // 仅当选中单个小节时执行删除操作
        console.log('执行removeBarFromSection操作');
        removeBarFromSection()
        event.preventDefault()
      }
    }
  }, [clearSelection, toggleEditMode, isEditMode, selection.selectedMeasureIds.length, removeBarFromSection])
  
  // 注册键盘事件监听 - 修改为捕获阶段
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };
    
    window.addEventListener('keydown', handleGlobalKeyDown, true); // 使用捕获阶段
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    }
  }, [handleKeyDown]);
  
  // 添加事件监听器来处理创建段落事件
  useEffect(() => {
    const handleCreateSection = (e: CustomEvent<{type: SectionType}>) => {
      console.log('创建段落事件被触发，类型为:', e.detail.type);
    };
    
    window.addEventListener('create-section', handleCreateSection as EventListener);
    return () => {
      window.removeEventListener('create-section', handleCreateSection as EventListener);
    };
  }, []);
  
  // 获取所有非"Any"类型的段落
  const sections = useMemo(() => {
    if (!analysisResult.structures) return [];
    return analysisResult.structures.filter(structure => structure.type !== 'Any');
  }, [analysisResult.structures]);
  
  // 获取"Any"类型段落
  const anySection = useMemo(() => {
    if (!analysisResult.structures) return null;
    return analysisResult.structures.find(structure => structure.type === 'Any');
  }, [analysisResult.structures]);
  
  // 将"Any"段落中的小节转换为基于小节编号的格子
  const renderAnySection = () => {
    if (!anySection || !anySection.measures || anySection.measures.length === 0) {
      return null;
    }
    
    // 直接使用anySection.measures中的数据获取小节编号
    const barNumbersMap = new Map<number, Measure>();
    
    // 收集每个小节及其信息，确保不会丢失任何小节
    anySection.measures.forEach(measure => {
      // 如果measure有明确的number属性，直接使用
      if (typeof measure.number === 'number') {
        // 处理可能的跨小节情况
        const span = measure.barSpan || measure.bars || 1;
        
        // 对于跨多个小节的measure，添加所有覆盖的小节编号
        for (let i = 0; i < span; i++) {
          const barNum = measure.number + i;
          // 只有当Map中不存在该小节或者新的measure更新时，才更新Map
          if (!barNumbersMap.has(barNum)) {
            barNumbersMap.set(barNum, {...measure});
          }
        }
      }
    });
    
    // 如果没有通过number属性找到小节，尝试通过chordsMap匹配
    if (barNumbersMap.size === 0) {
      anySection.measures.forEach(measure => {
        const chordData = chordsMap.find((c: any) => 
          c.chord_basic_pop === measure.chord || c.chord_majmin === measure.chord
        );
        
        if (chordData && chordData.start_bar !== undefined && chordData.end_bar !== undefined) {
          for (let i = chordData.start_bar; i < chordData.end_bar; i++) {
            if (!barNumbersMap.has(i)) {
              barNumbersMap.set(i, {...measure});
            }
          }
        }
      });
    }
    
    // 如果通过上述方法仍未找到barNumber，则尝试使用chordsMap中的所有数据
    if (barNumbersMap.size === 0 && chordsMap && chordsMap.length > 0) {
      chordsMap.forEach((chord: any) => {
        if (chord.start_bar !== undefined && chord.end_bar !== undefined) {
          for (let i = chord.start_bar; i < chord.end_bar; i++) {
            barNumbersMap.set(i, {
              number: i,
              chord: chord.chord_basic_pop || chord.chord_majmin || '',
              startTime: chord.start_time,
              endTime: chord.end_time,
              barSpan: 1,
              bars: 1
            });
          }
        }
      });
    }
    
    // 如果所有方法都无法找到barNumber，则使用1到totalBars的所有数字
    if (barNumbersMap.size === 0 && totalBars > 0) {
      for (let i = 1; i <= totalBars; i++) {
        barNumbersMap.set(i, {
          number: i,
          chord: '',
          startTime: 0,
          endTime: 0,
          barSpan: 1,
          bars: 1
        });
      }
    }
    
    // 将小节编号排序
    const sortedBarNumbers = Array.from(barNumbersMap.keys()).sort((a, b) => a - b);
    
    // 分成每行barsPerRow个小节
    const rows: number[][] = [];
    for (let i = 0; i < sortedBarNumbers.length; i += barsPerRow) {
      rows.push(sortedBarNumbers.slice(i, i + barsPerRow));
    }
    
    console.log(`Any段落包含 ${sortedBarNumbers.length} 个小节，每行显示 ${barsPerRow} 个`);
    
    return (
      <div className="mt-4">
        {rows.map((row, rowIndex) => (
          <div 
            key={`any-row-${rowIndex}`} 
            className="flex divide-x divide-gray-200 border-b border-gray-200 last:border-b-0"
          >
            {row.map((barNumber) => (
              <BarCell 
                key={`any-${barNumber}`}
                barNumber={barNumber}
                chordsMap={chordsMap}
                rootKey={normalizedKey}
                isEditMode={isEditMode}
                currentTool={currentTool}
                selection={selection}
                onSelectMeasure={selectMeasure}
                onStartSelection={startSelection}
                onUpdateSelection={updateSelection}
                onEndSelection={endSelection}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="mt-8 relative">
      {isEditMode && <EditToolbar />}
      <SectionDialog />
      <StandaloneChordEditDialog />
      
      {/* 添加引导浮窗 */}
      <GuideTip 
        isVisible={showGuide} 
        onClose={handleCloseGuide} 
        onEnterEditMode={handleEnterEditModeFromGuide} 
      />
      
      {/* 添加编辑模式引导提示 */}
      {showEditGuide && (
        <div className="fixed inset-x-0 top-24 flex justify-center z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-xl shadow-xl pointer-events-auto max-w-md"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-medium text-white mb-1">编辑模式已激活</h3>
                  <button 
                    onClick={handleCloseEditGuide}
                    className="ml-4 text-white/70 hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-white/90 text-sm mb-2">
                  现在您可以使用工具栏中的各种工具对谱表进行编辑。使用<span className="font-bold">选择工具</span>框选小节，然后创建段落或进行其他操作。
                </p>
                <div className="text-xs text-white/80">
                  提示：按 <kbd className="px-1.5 py-0.5 bg-white/20 rounded-md font-mono text-white">Esc</kbd> 可以取消选择，按 <kbd className="px-1.5 py-0.5 bg-white/20 rounded-md font-mono text-white">Ctrl+E</kbd> 可以退出编辑模式
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      {/* 歌曲标题 */}
      <div className="mb-4 text-center">
        {isEditingTitle ? (
          <input
            type="text"
            value={titleValue}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="text-2xl font-bold text-center border-b border-gray-300 focus:border-purple-500 focus:outline-none px-2 py-1 w-full max-w-lg mx-auto"
            autoFocus
          />
        ) : (
          <h2 
            className={`text-2xl font-bold ${isEditMode ? 'cursor-pointer hover:text-purple-600' : ''}`}
            onClick={handleTitleClick}
            title={isEditMode ? "点击编辑歌曲名称" : ""}
          >
            {titleValue}
          </h2>
        )}
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3 relative">
          <h3 className="text-lg font-medium">速记功能谱</h3>
          
          {/* 添加可关闭的悬浮提示 */}
          {showEditTip && !isEditMode && (
            <div className="absolute -top-20 left-16 w-64 bg-gradient-to-br from-white to-purple-50 border border-purple-100 rounded-lg shadow-lg z-10 overflow-hidden">
              <div className="flex items-start p-3">
                <div className="flex-shrink-0 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-purple-500">
                    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-purple-800 mb-1">编辑模式提示</div>
                  <div className="text-sm text-gray-700">
                    点击"编辑"按钮进入编辑模式，可以为歌曲分段并编辑和弦
                  </div>
                </div>
                <button 
                  className="flex-shrink-0 ml-2 -mt-1 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowEditTip(false)}
                  aria-label="关闭提示"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="h-1 bg-gradient-to-r from-purple-400 to-indigo-500"></div>
              {/* 重新定位箭头，使其朝下指向编辑按钮 */}
              <div className="absolute -bottom-2 left-[43px] w-4 h-4 bg-purple-50 border-t border-l border-purple-100 transform rotate-[225deg]"></div>
            </div>
          )}
          
          {!isEditMode && (
            <button 
              ref={editButtonRef}
              onClick={handleEditClick}
              className="text-sm px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
            >
              编辑
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <div className="text-sm px-3 py-1 bg-indigo-100 rounded-full text-indigo-800">
            调性: {normalizedKey}
          </div>
          <div className="text-sm px-3 py-1 bg-indigo-100 rounded-full text-indigo-800">
            速度: {bpm} BPM
          </div>
          <div className="text-sm px-3 py-1 bg-indigo-100 rounded-full text-indigo-800">
            小节数: {totalBars}
          </div>
          <ImageExport />
        </div>
      </div>
      
      <div id="chord-chart-container" className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {/* 显示所有非"Any"类型的段落 */}
        {sections.length > 0 && (
          <div className="divide-y divide-gray-200">
            {sections.map((section) => (
              <div key={section.id} className="overflow-hidden">
                {/* 段落标题栏 */}
                <div className={`px-4 py-2 flex justify-between items-center ${getSectionColorClass(section.type)}`}>
                  <div className="font-medium">{section.type}</div>
                  {isEditMode && (
                    <button
                      onClick={() => removeSection(section.id as string)}
                      className="text-sm px-2 py-1 rounded hover:bg-white/20 transition-colors"
                      title="解散段落"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* 小节格子 */}
                <div className="p-3">
                  {/* 将小节数组分成每行barsPerRow个 */}
                  {(() => {
                    // 直接使用section.measures中的数据获取小节编号
                    const barNumbersMap = new Map<number, Measure>();
                    
                    // 收集每个小节及其信息，确保不会丢失任何小节
                    section.measures.forEach(measure => {
                      // 如果measure有明确的number属性，直接使用
                      if (typeof measure.number === 'number') {
                        // 处理可能的跨小节情况
                        const span = measure.barSpan || measure.bars || 1;
                        
                        // 对于跨多个小节的measure，添加所有覆盖的小节编号
                        for (let i = 0; i < span; i++) {
                          const barNum = measure.number + i;
                          // 只有当Map中不存在该小节或者新的measure更新时，才更新Map
                          if (!barNumbersMap.has(barNum)) {
                            barNumbersMap.set(barNum, {...measure});
                          }
                        }
                      }
                    });
                    
                    // 如果没有通过number属性找到小节，尝试通过chordsMap匹配
                    if (barNumbersMap.size === 0) {
                      section.measures.forEach(measure => {
                        const chordData = chordsMap.find((c: any) => 
                          c.chord_basic_pop === measure.chord || c.chord_majmin === measure.chord
                        );
                        
                        if (chordData && chordData.start_bar !== undefined && chordData.end_bar !== undefined) {
                          for (let i = chordData.start_bar; i < chordData.end_bar; i++) {
                            if (!barNumbersMap.has(i)) {
                              barNumbersMap.set(i, {...measure});
                            }
                          }
                        }
                      });
                    }
                    
                    // 将小节编号排序
                    const sortedBarNumbers = Array.from(barNumbersMap.keys()).sort((a, b) => a - b);
                    
                    // 分成每行barsPerRow个小节
                    const rows: number[][] = [];
                    for (let i = 0; i < sortedBarNumbers.length; i += barsPerRow) {
                      rows.push(sortedBarNumbers.slice(i, i + barsPerRow));
                    }
                    
                    // 将每行转换成和弦序列字符串，用于比较是否相同
                    const rowSignatures: string[] = [];
                    rows.forEach(row => {
                      const signature = row.map(barNumber => {
                        const chordsInBar = chordsMap.filter((c: any) => 
                          c.start_bar <= barNumber && c.end_bar > barNumber
                        );
                        const chord = chordsInBar.length > 0 ? chordsInBar[0] : null;
                        const chordName = chord ? chord.chord_basic_pop || chord.chord_majmin || "" : "";
                        const numericDegree = chordToNumeric(chordName, normalizedKey);
                        return numericDegree || '-';
                      }).join('|');
                      rowSignatures.push(signature);
                    });
                    
                    // 找出连续重复的行
                    const folded: {start: number, count: number}[] = [];
                    let currentStart = 0;
                    let currentCount = 1;
                    
                    for (let i = 1; i < rowSignatures.length; i++) {
                      if (rowSignatures[i] === rowSignatures[currentStart]) {
                        // 如果当前行与比较起点相同，增加计数
                        currentCount++;
                      } else {
                        // 如果不同，记录之前的折叠信息并重置
                        if (currentCount > 1) {
                          folded.push({ start: currentStart, count: currentCount });
                        }
                        currentStart = i;
                        currentCount = 1;
                      }
                    }
                    
                    // 处理最后一组
                    if (currentCount > 1) {
                      folded.push({ start: currentStart, count: currentCount });
                    }
                    
                    // 记录哪些行已经被折叠了
                    const foldedRows = new Set<number>();
                    folded.forEach(fold => {
                      for (let i = fold.start; i < fold.start + fold.count; i++) {
                        if (i !== fold.start) {
                          foldedRows.add(i);
                        }
                      }
                    });
                    
                    console.log(`段落 ${section.type} 包含 ${sortedBarNumbers.length} 个小节`);
                    
                    // 渲染行，跳过被折叠的行
                    return rows.map((row, rowIndex) => {
                      // 如果这一行被折叠了，跳过
                      if (foldedRows.has(rowIndex)) return null;
                      
                      // 检查这一行是否是折叠的起始行
                      const fold = folded.find(f => f.start === rowIndex);
                      const isFolded = fold !== undefined;
                      
                      return (
                        <div 
                          key={`section-${section.id}-row-${rowIndex}`} 
                          className="flex divide-x divide-gray-200 border-b border-gray-200 last:border-b-0 relative"
                        >
                          {row.map((barNumber) => (
                            <BarCell 
                              key={`section-${section.id}-bar-${barNumber}`}
                              barNumber={barNumber}
                              chordsMap={chordsMap}
                              rootKey={normalizedKey}
                              isEditMode={isEditMode}
                              currentTool={currentTool}
                              selection={selection}
                              onSelectMeasure={selectMeasure}
                              onStartSelection={startSelection}
                              onUpdateSelection={updateSelection}
                              onEndSelection={endSelection}
                            />
                          ))}
                          
                          {/* 显示折叠标记和次数 */}
                          {isFolded && (
                            <div className="absolute right-0 top-0 bottom-0 flex items-center">
                              <div className="absolute right-0 flex items-center">
                                <span className="text-4xl text-gray-500 mr-1">{'}'}</span>
                                <span className="text-sm font-bold text-gray-500">×{fold.count}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean);
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* 显示"Any"类型的段落（未分类的小节） */}
        {anySection && (
          <div className="p-3">
            <div className="text-gray-500 text-sm mb-2 pl-2">
              未分类的小节
            </div>
            {renderAnySection()}
          </div>
        )}
      </div>
      
      {/* 快捷键指南 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">快捷键指南</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 text-sm font-mono bg-white border border-gray-300 rounded shadow-sm">Ctrl + E</kbd>
            <span className="text-sm text-gray-600">切换编辑模式</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 text-sm font-mono bg-white border border-gray-300 rounded shadow-sm">Delete</kbd>
            <span className="text-sm text-gray-600">删除选中的小节</span>
          </div>
          <div className="flex items-center gap-3">
            <kbd className="px-2 py-1 text-sm font-mono bg-white border border-gray-300 rounded shadow-sm">Esc</kbd>
            <span className="text-sm text-gray-600">清除选择</span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface BarCellProps {
  barNumber: number
  chordsMap: any[]
  rootKey: string
  isEditMode: boolean
  currentTool: string
  selection: any
  onSelectMeasure: (id: string, isMultiSelect: boolean) => void
  onStartSelection: (index: number) => void
  onUpdateSelection: (index: number) => void
  onEndSelection: () => void
}

// 单个小节格子组件
const BarCell: React.FC<BarCellProps> = ({
  barNumber,
  chordsMap,
  rootKey,
  isEditMode,
  currentTool,
  selection,
  onSelectMeasure,
  onStartSelection,
  onUpdateSelection,
  onEndSelection
}) => {
  // 查找该小节对应的和弦
  const chordsInBar = useMemo(() => {
    return chordsMap.filter((chord: any) => {
      return chord.start_bar <= barNumber && chord.end_bar > barNumber
    })
  }, [chordsMap, barNumber])
  
  // 如果有多个和弦匹配，使用第一个
  const chord = chordsInBar.length > 0 ? chordsInBar[0] : null
  
  // 和弦名称 - 始终使用原始和弦名称
  const chordName = chord ? chord.chord_basic_pop || chord.chord_majmin || "" : ""
  
  // 将和弦转换为级数表示法
  const numericDegree = chordToNumeric(chordName, rootKey)
  
  // 判断是否被选中
  const barId = `bar-${barNumber}`
  const isSelected = selection.selectedMeasureIds.includes(barId)
  
  // 选择器模式下的样式
  const selectorModeClasses = isEditMode && (currentTool === 'selector' || currentTool === 'createSection')
    ? 'hover:bg-gray-50 cursor-pointer transition-colors' 
    : ''
  
  // 选中状态的样式
  const selectedClasses = isSelected 
    ? 'bg-indigo-50 border border-indigo-300 -m-px z-10 shadow-sm' 
    : ''
    
  // 点击事件处理
  const handleClick = (e: React.MouseEvent) => {
    if (!isEditMode) return
    
    // 框选模式 - selector工具和createSection工具都支持选择
    if (currentTool === 'selector' || currentTool === 'createSection') {
      onSelectMeasure(barId, e.ctrlKey || e.metaKey)
    }
    else if (currentTool === 'editChord') {
      // 触发和弦编辑对话框
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-chord-edit-dialog', { 
          detail: { 
            measure: {
              id: barId,
              number: barNumber,
              barNumber: barNumber, // 添加小节编号属性
              chord: chordName,
              // 添加chord对象的其他属性，方便编辑
              ...(chord || {})
            } 
          }
        }))
      }
    }
  }
  
  // 选择器模式下的鼠标按下事件
  const handleMouseDown = () => {
    if (!isEditMode || (currentTool !== 'selector' && currentTool !== 'createSection')) return
    onStartSelection(barNumber - 1) // 索引从0开始
  }
  
  // 选择器模式下的鼠标移动事件
  const handleMouseMove = () => {
    if (!isEditMode || (currentTool !== 'selector' && currentTool !== 'createSection') || !selection.isSelecting) return
    onUpdateSelection(barNumber - 1)
  }
  
  // 选择器模式下的鼠标释放事件
  const handleMouseUp = () => {
    if (!isEditMode || (currentTool !== 'selector' && currentTool !== 'createSection') || !selection.isSelecting) return
    onEndSelection()
    
    // 如果是createSection工具且有选中的小节，则打开段落对话框
    if (currentTool === 'createSection' && selection.selectedMeasureIds.length > 0) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('open-section-dialog'))
      }
    }
  }
  
  // 确保选择器模式下可以批量选择
  const handleMouseLeave = () => {
    if (!isEditMode || (currentTool !== 'selector' && currentTool !== 'createSection') || !selection.isSelecting) return
    onUpdateSelection(barNumber - 1)
  }
  
  return (
    <div 
      className={`
        flex-1 p-2 text-center relative min-w-[60px]
        ${selectedClasses}
        ${selectorModeClasses}
      `}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col justify-center items-center h-full">
        <div 
          className="text-lg font-bold relative group cursor-help font-mono tracking-wide italic"
          title={chordName}
        >
          {numericDegree || '-'}
          
          {/* 悬停时显示原和弦名称的提示 */}
          {chordName && (
            <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 font-sans shadow-lg">
              {chordName}
            </span>
          )}
        </div>
        
        {/* 显示小节编号 */}
        <div className="text-xs text-gray-400 mt-0.5">
          #{barNumber}
        </div>
      </div>
    </div>
  )
}