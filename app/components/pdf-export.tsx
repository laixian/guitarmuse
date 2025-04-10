'use client'

import React from 'react'
import { useAudioStore } from '../store/audio-store'
import html2canvas from 'html2canvas'
import { Measure, SectionType } from '../types/audio'
import { chordToNumeric, normalizeKey } from '../lib/chord-utils'

// 段落类型对应的颜色
const sectionColors: Record<SectionType, {bg: string, border: string, text: string}> = {
  'Intro': {bg: '#dbeafe', border: '#93c5fd', text: '#1e40af'},
  'Verse': {bg: '#f3e8ff', border: '#d8b4fe', text: '#6b21a8'},
  'Chorus': {bg: '#fee2e2', border: '#fca5a5', text: '#991b1b'},
  'Bridge': {bg: '#fef9c3', border: '#fde047', text: '#854d0e'},
  'Solo': {bg: '#dcfce7', border: '#86efac', text: '#166534'},
  'Outro': {bg: '#f3f4f6', border: '#d1d5db', text: '#1f2937'},
  'Any': {bg: '#f9fafb', border: '#e5e7eb', text: '#4b5563'}
}

export const ImageExport = () => {
  const { analysisResult, isPdfExporting, exportPdfError, exportToPdf: storePdfExport, barsPerRow } = useAudioStore()

  const exportToImage = async () => {
    if (!analysisResult) {
      alert('没有可导出的分析结果')
      return
    }

    try {
      // 触发store中的状态更新
      await storePdfExport()
      
      console.log('开始生成图片...')
      console.log(`每行显示 ${barsPerRow} 个小节`)
      
      // 使用固定的图片宽度，不随barsPerRow变化
      const FIXED_IMAGE_WIDTH = 800 // 固定图片宽度
      const IPAD_WIDTH = FIXED_IMAGE_WIDTH
      
      // 页面内边距固定
      const PAGE_PADDING = 30
      
      // 使用固定字体大小和小节高度，不再与每行小节数关联
      const FIXED_CHORD_FONT_SIZE = 28 // 固定和弦字体大小，增大一倍
      const FIXED_CELL_HEIGHT = 52 // 将小节高度增加到原来的1.3倍
      const FIXED_SECTION_HEADER_SIZE = 16 // 固定段落标题字体大小
      const FIXED_SONG_TITLE_SIZE = 18 // 固定歌曲标题字体大小
      const FIXED_REPEAT_LABEL_SIZE = 22 // 固定循环标记字体大小，放大2倍
      
      // 内容区域分区（左侧90%，右侧10%）
      const LEFT_SECTION_WIDTH = Math.floor((IPAD_WIDTH - PAGE_PADDING * 2) * 0.9)
      const RIGHT_SECTION_WIDTH = Math.floor((IPAD_WIDTH - PAGE_PADDING * 2) * 0.1)
      const TOTAL_CONTENT_WIDTH = LEFT_SECTION_WIDTH + RIGHT_SECTION_WIDTH
      
      // 计算每个小节的宽度 = 左侧区域宽度 / 每行小节数
      const cellWidthBase = Math.floor(LEFT_SECTION_WIDTH / barsPerRow)
      // 小节高度固定
      const cellHeightBase = FIXED_CELL_HEIGHT
      
      // 使用固定的字体大小
      const chordFontSize = FIXED_CHORD_FONT_SIZE
      const sectionHeaderSize = FIXED_SECTION_HEADER_SIZE
      const songTitleSize = FIXED_SONG_TITLE_SIZE
      const repeatLabelSize = FIXED_REPEAT_LABEL_SIZE
      
      // 创建一个临时容器用于渲染图表
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.top = '-9999px'
      tempContainer.style.width = `${IPAD_WIDTH}px`
      document.body.appendChild(tempContainer)
      
      // 准备导出数据
      const rawData = analysisResult.raw_data || {}
      const rootKey = rawData['root key'] || analysisResult.key
      const bpm = rawData['bpm'] || analysisResult.tempo
      const chordsMap = rawData['chords map'] || []
      
      // 计算总小节数
      let totalBars = 0
      chordsMap.forEach((chord: any) => {
        if (chord.end_bar && chord.end_bar > totalBars) {
          totalBars = chord.end_bar
        }
      })
      
      // 标准化调性
      const normalizedKey = normalizeKey(rootKey)
      
      // 获取所有段落分类
      const sections = analysisResult.structures.filter(structure => structure.type !== 'Any')
      const anySection = analysisResult.structures.find(structure => structure.type === 'Any')
      
      // 创建HTML结构
      let exportHtml = `
        <div class="chord-chart-export" style="font-family: Arial, sans-serif; background-color: white; padding: ${PAGE_PADDING}px; border-radius: 12px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); width: ${IPAD_WIDTH}px; box-sizing: border-box;">
          <div class="song-title" style="text-align: center; margin-bottom: 20px; padding-top: 10px;">
            <h2 style="font-size: ${songTitleSize}px; font-weight: bold; margin: 0; line-height: 1.2;">${analysisResult.songTitle || '未命名歌曲'}</h2>
          </div>
          
          <div class="header" style="display: flex; justify-content: space-between; margin-bottom: 15px; align-items: center;">
            <h1 style="font-size: ${Math.floor(songTitleSize * 0.8)}px; font-weight: 600; margin: 0;">速记功能谱</h1>
            <div class="song-info" style="display: flex; gap: 10px;">
              <div style="background-color: #e0e7ff; padding: 4px 10px; border-radius: 9999px; color: #3730a3; font-size: ${Math.floor(sectionHeaderSize)}px;">
                调性: ${normalizedKey}
              </div>
              <div style="background-color: #e0e7ff; padding: 4px 10px; border-radius: 9999px; color: #3730a3; font-size: ${Math.floor(sectionHeaderSize)}px;">
                速度: ${bpm} BPM
              </div>
              <div style="background-color: #e0e7ff; padding: 4px 10px; border-radius: 9999px; color: #3730a3; font-size: ${Math.floor(sectionHeaderSize)}px;">
                小节数: ${totalBars}
              </div>
            </div>
          </div>
          
          <div class="chart-container" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      `
      
      // 添加段落内容
      if (sections.length > 0) {
        sections.forEach((section, sectionIndex) => {
          // 获取段落的颜色
          const sectionColor = sectionColors[section.type] || sectionColors.Any
          
          exportHtml += `
            <div class="section" style="border-bottom: ${sectionIndex < sections.length - 1 ? '1px solid #e5e7eb' : 'none'};">
              <div class="section-header" style="display: flex; align-items: center; padding: ${Math.floor(sectionHeaderSize * 0.25)}px ${Math.floor(sectionHeaderSize * 0.5)}px; background-color: ${sectionColor.bg}; border-bottom: 1px solid ${sectionColor.border};">
                <div style="font-weight: 800; color: ${sectionColor.text}; font-size: ${Math.floor(sectionHeaderSize * 1.5)}px;">${section.type}</div>
              </div>
              <div class="section-content">
          `
          
          // 收集该段落内所有小节编号
          const barNumbersMap = new Map<number, Measure>()
          
          section.measures.forEach(measure => {
            if (typeof measure.number === 'number') {
              const span = measure.barSpan || measure.bars || 1
              
              for (let i = 0; i < span; i++) {
                const barNum = measure.number + i
                if (!barNumbersMap.has(barNum)) {
                  barNumbersMap.set(barNum, {...measure})
                }
              }
            }
          })
          
          // 如果没有找到小节，尝试通过chordsMap匹配
          if (barNumbersMap.size === 0) {
            section.measures.forEach(measure => {
              const chordData = chordsMap.find((c: any) => 
                c.chord_basic_pop === measure.chord || c.chord_majmin === measure.chord
              )
              
              if (chordData && chordData.start_bar !== undefined && chordData.end_bar !== undefined) {
                for (let i = chordData.start_bar; i < chordData.end_bar; i++) {
                  if (!barNumbersMap.has(i)) {
                    barNumbersMap.set(i, {...measure})
                  }
                }
              }
            })
          }
          
          // 排序小节编号
          const sortedBarNumbers = Array.from(barNumbersMap.keys()).sort((a, b) => a - b)
          
          // 分成每行barsPerRow个小节
          const rows: number[][] = []
          for (let i = 0; i < sortedBarNumbers.length; i += barsPerRow) {
            rows.push(sortedBarNumbers.slice(i, i + barsPerRow))
          }
          
          // 创建行签名用于比较重复
          const rowSignatures: string[] = []
          rows.forEach(row => {
            const signature = row.map(barNumber => {
              const chord = chordsMap.find((c: any) => c.start_bar <= barNumber && c.end_bar > barNumber)
              const chordName = chord ? chord.chord_basic_pop || chord.chord_majmin || "" : ""
              const numericDegree = chordToNumeric(chordName, normalizedKey)
              return numericDegree || '-'
            }).join('|')
            rowSignatures.push(signature)
          })
          
          // 找出重复行并记录
          const repeatInfo: {startRow: number, count: number}[] = []
          let currentStart = 0
          let repeatCount = 1
          
          for (let i = 1; i < rowSignatures.length; i++) {
            if (rowSignatures[i] === rowSignatures[currentStart]) {
              repeatCount++
            } else {
              if (repeatCount > 1) {
                repeatInfo.push({startRow: currentStart, count: repeatCount})
              }
              currentStart = i
              repeatCount = 1
            }
          }
          
          // 处理最后一组
          if (repeatCount > 1) {
            repeatInfo.push({startRow: currentStart, count: repeatCount})
          }
          
          // 记录已被折叠的行
          const foldedRows = new Set<number>()
          repeatInfo.forEach(info => {
            for (let i = info.startRow + 1; i < info.startRow + info.count; i++) {
              foldedRows.add(i)
            }
          })
          
          // 创建二列布局容器
          exportHtml += `
            <div style="display: flex; width: 100%;">
              <!-- 左侧区域 - 小节内容 -->
              <div style="width: ${LEFT_SECTION_WIDTH}px; padding: ${Math.floor(cellHeightBase * 0.05)}px;">
          `
          
          // 渲染行 - 左侧区域（小节内容）
          for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            // 如果行被折叠则跳过
            if (foldedRows.has(rowIndex)) continue
            
            const row = rows[rowIndex]
            
            exportHtml += `
              <div class="bar-row" style="display: flex; margin-bottom: ${Math.floor(cellHeightBase * 0.08)}px; width: 100%; border-bottom: 1px solid #e5e7eb;">
            `
            
            // 渲染每个小节
            row.forEach((barNumber, index) => {
              const chord = chordsMap.find((c: any) => c.start_bar <= barNumber && c.end_bar > barNumber)
              const chordName = chord ? chord.chord_basic_pop || chord.chord_majmin || "" : ""
              const numericDegree = chordToNumeric(chordName, normalizedKey)
              
              exportHtml += `
                <div class="bar-cell" style="
                  width: ${cellWidthBase}px; 
                  height: ${cellHeightBase}px; 
                  display: flex; 
                  justify-content: center; 
                  align-items: flex-start; 
                  padding-top: 2px;
                  padding-bottom: 12px;
                  ${index < row.length - 1 ? 'border-right: 1px solid #e5e7eb;' : ''}
                  box-sizing: border-box;
                ">
                  <div class="chord" style="font-size: ${chordFontSize}px; font-weight: 700; font-family: monospace; letter-spacing: 0.05em; font-style: italic;">
                    ${numericDegree || '-'}
                  </div>
                </div>
              `
            })
            
            exportHtml += `</div>` // 关闭 bar-row
          }
          
          exportHtml += `</div>` // 关闭左侧区域
          
          // 右侧区域 - 循环次数
          exportHtml += `
            <!-- 右侧区域 - 循环次数 -->
            <div style="width: ${RIGHT_SECTION_WIDTH}px; padding: ${Math.floor(cellHeightBase * 0.05)}px; position: relative;">
          `
          
          // 为每个重复行添加循环标记
          repeatInfo.forEach(info => {
            // 计算标记的垂直位置
            let topPosition = 0
            let visibleRows = 0
            
            for (let i = 0; i < info.startRow; i++) {
              if (!foldedRows.has(i)) {
                topPosition += cellHeightBase + Math.floor(cellHeightBase * 0.1) // 小节高度 + 行间距
                visibleRows++
              }
            }
            
            // 垂直居中对齐 - 标记高度应与行高垂直居中
            // 加上半个小节高度的一半，使标记垂直居中
            topPosition += Math.floor(cellHeightBase / 2) - 15
            
            exportHtml += `
              <div style="
                position: absolute;
                top: ${topPosition}px;
                left: 5px;
                display: flex;
                align-items: center;
                transform: translateY(-50%);
              ">
                <div style="
                  color: #4338ca;
                  display: flex;
                  align-items: center;
                ">
                  <span style="font-size: ${Math.floor(repeatLabelSize * 1.5)}px; line-height: 0.8; margin-right: 3px; font-weight: normal;">]</span>
                  <span style="font-size: ${Math.floor(repeatLabelSize * 0.75)}px; font-weight: normal;">×${info.count}</span>
                </div>
              </div>
            `
          })
          
          exportHtml += `</div>` // 关闭右侧区域
          exportHtml += `</div>` // 关闭二列布局容器
          exportHtml += `
              </div>
            </div>
          ` // 关闭 section-content 和 section
        })
      }
      
      // 添加Any段落内容（未分类的小节）
      if (anySection && anySection.measures && anySection.measures.length > 0) {
        const sectionColor = sectionColors.Any
        
        exportHtml += `
          <div class="section">
            <div class="section-header" style="display: flex; align-items: center; padding: ${Math.floor(sectionHeaderSize * 0.25)}px ${Math.floor(sectionHeaderSize * 0.5)}px; background-color: ${sectionColor.bg}; border-bottom: 1px solid ${sectionColor.border};">
              <div style="font-weight: 800; color: ${sectionColor.text}; font-size: ${Math.floor(sectionHeaderSize * 1.5)}px;">未分类的小节</div>
            </div>
            <div class="section-content">
        `
        
        // 收集Any段落内所有小节编号
        const barNumbersMap = new Map<number, Measure>()
        
        anySection.measures.forEach(measure => {
          if (typeof measure.number === 'number') {
            const span = measure.barSpan || measure.bars || 1
            
            for (let i = 0; i < span; i++) {
              const barNum = measure.number + i
              if (!barNumbersMap.has(barNum)) {
                barNumbersMap.set(barNum, {...measure})
              }
            }
          }
        })
        
        // 如果没有找到小节，尝试通过chordsMap匹配
        if (barNumbersMap.size === 0 && chordsMap && chordsMap.length > 0) {
          chordsMap.forEach((chord: any) => {
            if (chord.start_bar !== undefined && chord.end_bar !== undefined) {
              for (let i = chord.start_bar; i < chord.end_bar; i++) {
                // 检查这个小节是否已经在其他段落中
                const isInOtherSection = sections.some(section => 
                  section.measures.some(measure => 
                    typeof measure.number === 'number' && 
                    i >= measure.number && 
                    i < measure.number + (measure.barSpan || measure.bars || 1)
                  )
                )
                
                if (!isInOtherSection && !barNumbersMap.has(i)) {
                  barNumbersMap.set(i, {
                    number: i,
                    chord: chord.chord_basic_pop || chord.chord_majmin || '',
                    startTime: chord.start_time,
                    endTime: chord.end_time,
                    barSpan: 1,
                    bars: 1
                  })
                }
              }
            }
          })
        }
        
        // 排序小节编号
        const sortedBarNumbers = Array.from(barNumbersMap.keys()).sort((a, b) => a - b)
        
        // 分成每行barsPerRow个小节
        const rows: number[][] = []
        for (let i = 0; i < sortedBarNumbers.length; i += barsPerRow) {
          rows.push(sortedBarNumbers.slice(i, i + barsPerRow))
        }
        
        // 创建行签名用于比较重复
        const rowSignatures: string[] = []
        rows.forEach(row => {
          const signature = row.map(barNumber => {
            const chord = chordsMap.find((c: any) => c.start_bar <= barNumber && c.end_bar > barNumber)
            const chordName = chord ? chord.chord_basic_pop || chord.chord_majmin || "" : ""
            const numericDegree = chordToNumeric(chordName, normalizedKey)
            return numericDegree || '-'
          }).join('|')
          rowSignatures.push(signature)
        })
        
        // 找出重复行并记录
        const repeatInfo: {startRow: number, count: number}[] = []
        let currentStart = 0
        let repeatCount = 1
        
        for (let i = 1; i < rowSignatures.length; i++) {
          if (rowSignatures[i] === rowSignatures[currentStart]) {
            repeatCount++
          } else {
            if (repeatCount > 1) {
              repeatInfo.push({startRow: currentStart, count: repeatCount})
            }
            currentStart = i
            repeatCount = 1
          }
        }
        
        // 处理最后一组
        if (repeatCount > 1) {
          repeatInfo.push({startRow: currentStart, count: repeatCount})
        }
        
        // 记录已被折叠的行
        const foldedRows = new Set<number>()
        repeatInfo.forEach(info => {
          for (let i = info.startRow + 1; i < info.startRow + info.count; i++) {
            foldedRows.add(i)
          }
        })
        
        // 创建二列布局容器
        exportHtml += `
          <div style="display: flex; width: 100%;">
            <!-- 左侧区域 - 小节内容 -->
            <div style="width: ${LEFT_SECTION_WIDTH}px; padding: ${Math.floor(cellHeightBase * 0.05)}px;">
        `
        
        // 渲染行 - 左侧区域（小节内容）
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          // 如果行被折叠则跳过
          if (foldedRows.has(rowIndex)) continue
          
          const row = rows[rowIndex]
          
          exportHtml += `
            <div class="bar-row" style="display: flex; margin-bottom: ${Math.floor(cellHeightBase * 0.08)}px; width: 100%; border-bottom: 1px solid #e5e7eb;">
          `
          
          // 渲染每个小节
          row.forEach((barNumber, index) => {
            const chord = chordsMap.find((c: any) => c.start_bar <= barNumber && c.end_bar > barNumber)
            const chordName = chord ? chord.chord_basic_pop || chord.chord_majmin || "" : ""
            const numericDegree = chordToNumeric(chordName, normalizedKey)
            
            exportHtml += `
              <div class="bar-cell" style="
                width: ${cellWidthBase}px; 
                height: ${cellHeightBase}px; 
                display: flex; 
                justify-content: center; 
                align-items: flex-start; 
                padding-top: 2px;
                padding-bottom: 12px;
                ${index < row.length - 1 ? 'border-right: 1px solid #e5e7eb;' : ''}
                box-sizing: border-box;
              ">
                <div class="chord" style="font-size: ${chordFontSize}px; font-weight: 700; font-family: monospace; letter-spacing: 0.05em; font-style: italic;">
                  ${numericDegree || '-'}
                </div>
              </div>
            `
          })
          
          exportHtml += `</div>` // 关闭 bar-row
        }
        
        exportHtml += `</div>` // 关闭左侧区域
        
        // 右侧区域 - 循环次数
        exportHtml += `
          <!-- 右侧区域 - 循环次数 -->
          <div style="width: ${RIGHT_SECTION_WIDTH}px; padding: ${Math.floor(cellHeightBase * 0.05)}px; position: relative;">
        `
        
        // 为每个重复行添加循环标记
        repeatInfo.forEach(info => {
          // 计算标记的垂直位置
          let topPosition = 0
          let visibleRows = 0
          
          for (let i = 0; i < info.startRow; i++) {
            if (!foldedRows.has(i)) {
              topPosition += cellHeightBase + Math.floor(cellHeightBase * 0.1) // 小节高度 + 行间距
              visibleRows++
            }
          }
          
          // 垂直居中对齐 - 标记高度应与行高垂直居中
          // 加上半个小节高度的一半，使标记垂直居中
          topPosition += Math.floor(cellHeightBase / 2) - 15
          
          exportHtml += `
            <div style="
              position: absolute;
              top: ${topPosition}px;
              left: 5px;
              display: flex;
              align-items: center;
              transform: translateY(-50%);
            ">
              <div style="
                color: #4338ca;
                display: flex;
                align-items: center;
              ">
                <span style="font-size: ${Math.floor(repeatLabelSize * 1.5)}px; line-height: 0.8; margin-right: 3px; font-weight: normal;">]</span>
                <span style="font-size: ${Math.floor(repeatLabelSize * 0.75)}px; font-weight: normal;">×${info.count}</span>
              </div>
            </div>
          `
        })
        
        exportHtml += `</div>` // 关闭右侧区域
        exportHtml += `</div>` // 关闭二列布局容器
        exportHtml += `
            </div>
          </div>
        ` // 关闭 section-content 和 section
      }
      
      // 关闭HTML结构
      exportHtml += `
          </div>
        </div>
      `
      
      // 添加到临时容器
      tempContainer.innerHTML = exportHtml
      
      // 使用html2canvas捕获
      try {
        const canvas = await html2canvas(tempContainer, {
          scale: 1.5, // 适当降低缩放比例，避免文件过大
          backgroundColor: '#ffffff',
          logging: false,
          useCORS: true,
          allowTaint: true
        })
        
        // 移除临时容器
        document.body.removeChild(tempContainer)
        
        // 获取图片数据
        const imgData = canvas.toDataURL('image/png')
        
        // 生成文件名
        const fileName = `和弦分析_${analysisResult.key || 'Unknown'}_${Math.round(analysisResult.tempo || 0)}bpm_${new Date().toISOString().split('T')[0]}.png`
        
        // 创建下载链接
        const downloadLink = document.createElement('a')
        downloadLink.href = imgData
        downloadLink.download = fileName
        downloadLink.style.display = 'none'
        document.body.appendChild(downloadLink)
        
        // 触发下载
        downloadLink.click()
        
        // 清理下载链接
        setTimeout(() => {
          document.body.removeChild(downloadLink)
          console.log('图片导出完成!')
        }, 100)
      } catch (canvasError) {
        console.error('canvas生成错误:', canvasError)
        
        // 确保移除临时容器
        if (document.body.contains(tempContainer)) {
          document.body.removeChild(tempContainer)
        }
        
        throw canvasError
      }
    } catch (error) {
      console.error('图片导出错误:', error)
      alert('图片导出失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }

  return (
    <button 
      onClick={exportToImage}
      className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors"
      disabled={!analysisResult || isPdfExporting}
    >
      {isPdfExporting ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          导出中...
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          导出图片
        </>
      )}
    </button>
  )
} 