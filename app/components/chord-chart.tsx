'use client'

import React, { useEffect, useCallback, useMemo } from 'react'
import { useAudioStore } from '../store/audio-store'
import { Measure, SectionType, SongStructure } from '../types/audio'
import { chordToNumeric, normalizeKey } from '../lib/chord-utils'
import { EditToolbar } from './edit-toolbar'
import { SectionDialog } from './section-dialog'
import { StandaloneChordEditDialog } from './chord-edit-dialog'
import { ImageExport } from './pdf-export'

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
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium">速记功能谱</h3>
          {!isEditMode && (
            <button 
              onClick={toggleEditMode}
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