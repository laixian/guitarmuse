'use client'

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import { 
  AudioProcessingState, 
  ProcessingStep, 
  AudioAnalysisResult, 
  SectionType, 
  SongStructure, 
  Measure,
  EditTool,
  SelectionState,
  BarNode
} from '../types/audio'
import { analyzeAudioClient } from '../lib/audio-analyzer-adapter'

// 超时设置（毫秒）
const PROCESSING_TIMEOUT = 60000

interface AudioStore {
  audioFile: File | null;
  audioUrl: string | null;
  isProcessing: boolean;
  processingProgress: number;
  uploadProgress: number;
  processingError: string | null;
  analysisResult: AudioAnalysisResult | null;
  preferredKey: string | null;
  isEditing: boolean;
  hasUserEdits: boolean;
  selectedTimeRange: { start: number | null; end: number | null } | null;
  isEditMode: boolean;
  currentTool: EditTool;
  selection: SelectionState;
  
  // 添加段落对话框状态
  isDialogOpen: boolean;
  selectedSectionType: SectionType | null;
  
  // 添加PDF导出相关状态
  isPdfExporting: boolean;
  exportPdfError: string | null;
  
  // 添加每行小节数设置
  barsPerRow: 4 | 8;
  
  setAudioFile: (file: File) => void;
  setPreferredKey: (key: string | null) => void;
  clearAudio: () => void;
  startProcessing: () => Promise<void>;
  toggleEditMode: () => void;
  updateAnalysisKey: (key: string) => void;
  updateAnalysisTempo: (tempo: number) => void;
  updateSongTitle: (title: string) => void;
  updateStructure: (structureIndex: number, updatedStructure: Partial<SongStructure>) => void;
  addStructure: (type: string, afterIndex?: number) => void;
  removeStructure: (index: number) => void;
  updateMeasure: (structureIndex: number, measureIndex: number, updatedMeasure: Partial<Measure>) => void;
  addMeasure: (structureIndex: number, afterIndex?: number) => void;
  removeMeasure: (structureIndex: number, measureIndex: number) => void;
  resetAnalysis: () => void;
  duplicateStructure: (index: number) => void;
  reorderStructures: (fromIndex: number, toIndex: number) => void;
  setSelectedTimeStart: (time: number | null) => void;
  setSelectedTimeEnd: (time: number | null) => void;
  clearSelectedTimeRange: () => void;
  createStructureFromTimeRange: (type: SectionType) => void;
  setCurrentTool: (tool: EditTool) => void;
  selectMeasure: (measureId: string, isMultiSelect?: boolean) => void;
  clearSelection: () => void;
  startSelection: (index: number) => void;
  updateSelection: (index: number) => void;
  endSelection: () => void;
  openSectionDialog: () => void;
  closeSectionDialog: () => void;
  setSectionType: (type: SectionType) => void;
  createSection: () => void;
  removeSection: (sectionId: string) => void;
  updateMeasureChord: (measureId: string, newChord: string) => void;
  updateBarChord: (barNumber: number, newChord: string) => void;
  exportToPdf: () => Promise<void>;
  removeBarFromSection: () => void;
  toggleBarsPerRow: () => void;
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  audioFile: null,
  audioUrl: null,
  isProcessing: false,
  processingProgress: 0,
  uploadProgress: 0,
  processingError: null,
  analysisResult: null,
  preferredKey: null,
  isEditing: false,
  hasUserEdits: false,
  selectedTimeRange: null,
  isEditMode: false,
  currentTool: 'selector' as EditTool,
  selection: {
    isSelecting: false,
    startIndex: null,
    endIndex: null,
    selectedMeasureIds: []
  },
  
  // 添加段落对话框状态
  isDialogOpen: false,
  selectedSectionType: null,

  // 添加PDF导出相关状态
  isPdfExporting: false,
  exportPdfError: null,

  // 初始化每行小节数为8
  barsPerRow: 8,

  setAudioFile: (file: File) => {
    const currentUrl = get().audioUrl;
    if (currentUrl) {
      try {
        URL.revokeObjectURL(currentUrl);
        console.log("已撤销旧的音频URL");
      } catch (e) {
        console.error("撤销旧URL失败:", e);
      }
    }
    
    try {
      const audioUrl = URL.createObjectURL(file);
      console.log("已创建新的音频URL:", audioUrl, "文件类型:", file.type);
      
      set({
        audioFile: file,
        audioUrl,
        processingError: null,
        analysisResult: null,
        hasUserEdits: false,
      });
    } catch (error) {
      console.error("创建音频URL失败:", error);
      set({
        processingError: "音频文件无法加载"
      });
    }
  },

  setPreferredKey: (key: string | null) => {
    set({ preferredKey: key });
  },

  clearAudio: () => {
    const currentUrl = get().audioUrl;
    if (currentUrl) {
      try {
        URL.revokeObjectURL(currentUrl);
        console.log("已撤销音频URL");
      } catch (e) {
        console.error("撤销音频URL失败:", e);
      }
    }
    
    set({
      audioFile: null,
      audioUrl: null,
      isProcessing: false,
      processingProgress: 0,
      uploadProgress: 0,
      processingError: null,
      analysisResult: null,
      preferredKey: null,
      isEditing: false,
      hasUserEdits: false,
      isEditMode: false,
      currentTool: 'selector' as EditTool,
      selection: {
        isSelecting: false,
        startIndex: null,
        endIndex: null,
        selectedMeasureIds: []
      },
    });
  },

  startProcessing: async () => {
    const { audioFile, preferredKey } = get();
    
    if (!audioFile) {
      set({ processingError: '没有选择音频文件' });
      return;
    }
    
    set({
      isProcessing: true,
      processingProgress: 0,
      uploadProgress: 0,
      processingError: null,
      hasUserEdits: false,
    });
    
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      console.log(`开始使用Python API分析音频，文件: ${audioFile.name}`);
      
      progressInterval = setInterval(() => {
        set(state => {
          if (state.uploadProgress < 100) {
            const newUploadProgress = Math.min(state.uploadProgress + 3, 95);
            return {
              uploadProgress: newUploadProgress,
              processingProgress: newUploadProgress / 2
            };
          } 
          else {
            const newProgress = Math.min(state.processingProgress + 1, 95);
            return { processingProgress: newProgress };
          }
        });
      }, 100);
      
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      if (preferredKey) {
        formData.append('key', preferredKey);
        console.log(`请求指定调性: ${preferredKey}`);
      }
      
      // 更新上传进度
      const req = new XMLHttpRequest();
      req.open('POST', '/api/analyze-audio');
      
      req.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          set({ uploadProgress: percentComplete });
        }
      });
      
      const result = await analyzeAudioClient(formData);
      
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      if (!result) {
        throw new Error("分析结果为空");
      }
      
      console.log("分析完成，结果:", result);
      
      // 确保结构数组存在
      if (!result.structures || !Array.isArray(result.structures)) {
        result.structures = [];
      }
      
      // 处理每个段落，确保每个段落具有唯一ID
      result.structures = result.structures.map(structure => {
        if (!structure.id) {
          structure.id = uuidv4();
        }
        
        // 确保每个小节的ID和结构ID
        if (structure.measures && Array.isArray(structure.measures)) {
          structure.measures = structure.measures.map(measure => ({
            ...measure,
            id: measure.id || uuidv4(),
            structureId: structure.id
          }));
        } else {
          structure.measures = [];
        }
        
        return structure;
      });
      
      // 确保有一个"Any"类型的段落用于存放未分类的小节
      if (!result.structures.some(s => s.type === 'Any')) {
        // 从原始数据中获取和弦地图
        const chordsMap = result.raw_data?.['chords map'] || [];
        const allMeasures: Measure[] = [];
        
        // 根据和弦地图创建小节
        if (chordsMap && chordsMap.length > 0) {
          chordsMap.forEach((chord: any) => {
            if (chord.start_bar !== undefined && chord.end_bar !== undefined) {
              // 创建对应的measure对象
              const measure: Measure = {
                id: uuidv4(),
                number: chord.start_bar,
                chord: chord.chord_basic_pop || chord.chord_majmin || '',
                startTime: chord.start_time,
                endTime: chord.end_time,
                barSpan: chord.end_bar - chord.start_bar,
                bars: chord.end_bar - chord.start_bar
              };
              allMeasures.push(measure);
            }
          });
        }
        
        // 按开始时间排序
        allMeasures.sort((a, b) => a.startTime - b.startTime);
        
        const anyStructure: SongStructure = {
          id: uuidv4(),
          type: 'Any',
          startTime: allMeasures.length > 0 ? allMeasures[0].startTime : 0,
          endTime: allMeasures.length > 0 ? allMeasures[allMeasures.length - 1].endTime : 0,
          measures: allMeasures.map(measure => ({
            ...measure,
            structureId: undefined
          }))
        };
        
        result.structures.push(anyStructure);
      }
      
      // 生成独立的 bars_list 数据结构
      // 从和弦图中获取所有小节信息，确保每个小节都是完全独立的实体
      const chordsMap = result.raw_data?.['chords map'] || [];
      const barsList: BarNode[] = [];
      
      // 第一步：计算总小节数
      let totalBars = 0;
      if (chordsMap && chordsMap.length > 0) {
        chordsMap.forEach((chord: any) => {
          if (chord.end_bar !== undefined && chord.end_bar > totalBars) {
            totalBars = chord.end_bar;
          }
        });
      }
      
      console.log(`检测到总小节数: ${totalBars}`);
      
      // 获取Any段落的ID，确保有一个有效的字符串ID
      const anyStructureId = result.structures.find(s => s.type === 'Any')?.id || uuidv4();
      
      // 第二步：为每个小节创建一个独立的BarNode对象
      // 小节编号从1开始
      for (let barNumber = 1; barNumber < totalBars; barNumber++) {
        // 查找该小节对应的和弦数据
        const matchingChord = chordsMap.find((chord: any) => 
          chord.start_bar <= barNumber && chord.end_bar > barNumber
        );
        
        if (matchingChord) {
          // 创建完全独立的小节实体
          const barNode: BarNode = {
            id: `bar-${barNumber}`,
            number: barNumber,
            chord: matchingChord.chord_basic_pop || matchingChord.chord_majmin || '',
            startTime: matchingChord.start_time,
            endTime: matchingChord.end_time,
            // 初始时，所有小节都属于Any结构
            structureId: anyStructureId
          };
          barsList.push(barNode);
          
          console.log(`创建独立小节: #${barNumber}, 和弦: ${barNode.chord}`);
        } else {
          // 如果找不到对应的和弦数据，创建一个空的小节
          barsList.push({
            id: `bar-${barNumber}`,
            number: barNumber,
            chord: '',  // 默认为空和弦
            startTime: 0,
            endTime: 0,
            structureId: anyStructureId
          });
          console.log(`创建空小节: #${barNumber}`);
        }
      }
      
      // 确保bars_list按小节编号排序
      barsList.sort((a, b) => a.number - b.number);
      
      // 第三步：根据bars_list生成Any段落的measures
      // 找到Any结构并重新生成它的measures
      const anyStructure = result.structures.find(s => s.type === 'Any');
      if (anyStructure) {
        // 从barsList中提取属于Any段落的小节
        const anyMeasures: Measure[] = barsList
          .filter(bar => bar.structureId === anyStructureId)
          .map(bar => ({
            id: uuidv4(), // 生成新的ID
            number: bar.number,
            chord: bar.chord,
            startTime: bar.startTime,
            endTime: bar.endTime,
            structureId: anyStructureId,
            barSpan: 1, // 确保每个小节都是独立的
            bars: 1     // 确保每个小节都是独立的
          }));
        
        // 更新Any段落的measures
        anyStructure.measures = anyMeasures;
        
        console.log(`更新Any段落的measures，包含 ${anyMeasures.length} 个小节`);
      } else {
        console.log("未找到Any段落，无法更新measures");
      }
      
      console.log(`总共创建了 ${barsList.length} 个独立小节数据，总小节数: ${totalBars}`);
      
      // 添加bars_list到结果中
      result.bars_list = barsList;
      
      set({
        analysisResult: result,
        isProcessing: false,
        processingProgress: 100,
        processingError: null,
      });
      
      return;
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      console.error("音频处理过程中发生错误:", error);
      
      set({
        isProcessing: false,
        processingProgress: 0,
        processingError: error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
            ? error 
            : '音频处理过程中发生未知错误'
      });
    }
  },

  toggleEditMode: () => {
    set(state => ({ 
      isEditMode: !state.isEditMode,
      selection: state.isEditMode ? {
        isSelecting: false,
        startIndex: null,
        endIndex: null,
        selectedMeasureIds: []
      } : state.selection
    }));
  },

  updateAnalysisKey: (key: string) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      return {
        analysisResult: {
          ...state.analysisResult,
          key: key
        },
        hasUserEdits: true
      };
    });
  },

  updateAnalysisTempo: (tempo: number) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      return {
        analysisResult: {
          ...state.analysisResult,
          tempo: tempo
        },
        hasUserEdits: true
      };
    });
  },

  updateSongTitle: (title: string) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      return {
        analysisResult: {
          ...state.analysisResult,
          songTitle: title
        },
        hasUserEdits: true
      };
    });
  },

  updateStructure: (structureIndex: number, updatedStructure: Partial<SongStructure>) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      const newStructures = [...state.analysisResult.structures];
      newStructures[structureIndex] = {
        ...newStructures[structureIndex],
        ...updatedStructure
      };
      
      return {
        analysisResult: {
          ...state.analysisResult,
          structures: newStructures
        },
        hasUserEdits: true
      };
    });
  },

  addStructure: (type: string, afterIndex?: number) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      const newStructures = [...state.analysisResult.structures];
      const lastStructure = newStructures[newStructures.length - 1];
      const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newStructures.length;
      
      let startTime, endTime;
      
      if (afterIndex !== undefined && afterIndex < newStructures.length) {
        startTime = newStructures[afterIndex].endTime;
        
        if (afterIndex < newStructures.length - 1) {
          endTime = newStructures[afterIndex + 1].startTime;
        } else {
          endTime = startTime + 16; // 默认16秒，通常可以容纳4个标准小节
        }
      } else {
        startTime = lastStructure ? lastStructure.endTime : 0;
        endTime = startTime + 16; // 默认16秒，通常可以容纳4个标准小节
      }
      
      const validType = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'].includes(type) 
        ? type as SectionType 
        : 'Verse' as SectionType;
      
      // 计算每小节平均时长
      const beatsPerMeasure = 4; // 4/4拍
      const measuresPerPhrase = 4; // 一个乐句通常有4个小节
      const numberOfMeasures = beatsPerMeasure; // 初始设为4小节
      const measureDuration = (endTime - startTime) / numberOfMeasures;
        
      // 创建包含多个小节的新段落
      const measures: Measure[] = [];
      
      for (let i = 0; i < numberOfMeasures; i++) {
        const measureStart = startTime + (i * measureDuration);
        const measureEnd = startTime + ((i + 1) * measureDuration);
        
        // 为每个小节分配适当的和弦，这里简单使用调性和弦
        let chord = state.analysisResult.key || 'C';
        
        // 对于4/4拍的音乐，可以尝试使用简单的I-IV-V-I和弦进行
        const commonProgressions: Record<string, string[]> = {
          'C': ['C', 'F', 'G', 'C'],
          'G': ['G', 'C', 'D', 'G'],
          'D': ['D', 'G', 'A', 'D'],
          'A': ['A', 'D', 'E', 'A'],
          'E': ['E', 'A', 'B', 'E'],
          'F': ['F', 'Bb', 'C', 'F'],
          'Am': ['Am', 'Dm', 'E', 'Am'],
          'Em': ['Em', 'Am', 'B', 'Em']
        };
        
        // 选择合适的和弦进行
        const key = state.analysisResult.key || 'C';
        const progression = commonProgressions[key] || commonProgressions['C'];
        chord = progression[i % progression.length];
        
        measures.push({
          number: i + 1,
          chord: chord,
          startTime: measureStart,
          endTime: measureEnd
        });
      }
      
      const newStructure: SongStructure = {
        type: validType,
        startTime: startTime,
        endTime: endTime,
        measures: measures
      };
      
      newStructures.splice(insertIndex, 0, newStructure);
      
      return {
        analysisResult: {
          ...state.analysisResult,
          structures: newStructures
        },
        hasUserEdits: true
      };
    });
  },

  removeStructure: (index: number) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      const newStructures = [...state.analysisResult.structures];
      
      if (newStructures.length <= 1) {
        return state;
      }
      
      newStructures.splice(index, 1);
      
      return {
        analysisResult: {
          ...state.analysisResult,
          structures: newStructures
        },
        hasUserEdits: true
      };
    });
  },

  updateMeasure: (structureIndex: number, measureIndex: number, updatedMeasure: Partial<Measure>) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      const newStructures = [...state.analysisResult.structures];
      const structure = newStructures[structureIndex];
      
      if (!structure) return state;
      
      const newMeasures = [...structure.measures];
      newMeasures[measureIndex] = {
        ...newMeasures[measureIndex],
        ...updatedMeasure
      };
      
      newStructures[structureIndex] = {
        ...structure,
        measures: newMeasures
      };
      
      return {
        analysisResult: {
          ...state.analysisResult,
          structures: newStructures
        },
        hasUserEdits: true
      };
    });
  },

  addMeasure: (structureIndex: number, afterIndex?: number) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      const newStructures = [...state.analysisResult.structures];
      const structure = newStructures[structureIndex];
      
      if (!structure) return state;
      
      const newMeasures = [...structure.measures];
      const insertIndex = afterIndex !== undefined ? afterIndex + 1 : newMeasures.length;
      
      let startTime, endTime;
      
      if (afterIndex !== undefined && afterIndex < newMeasures.length) {
        startTime = newMeasures[afterIndex].endTime;
        
        if (afterIndex < newMeasures.length - 1) {
          endTime = newMeasures[afterIndex + 1].startTime;
        } else {
          endTime = startTime + 2;
        }
      } else if (newMeasures.length > 0) {
        const lastMeasure = newMeasures[newMeasures.length - 1];
        startTime = lastMeasure.endTime;
        endTime = startTime + (lastMeasure.endTime - lastMeasure.startTime);
      } else {
        startTime = structure.startTime;
        endTime = startTime + 2;
      }
      
      // 创建新的小节
      const newMeasure: Measure = {
        number: insertIndex + 1,
        chord: state.analysisResult.key || 'C',
        startTime: startTime,
        endTime: endTime
      };
      
      newMeasures.splice(insertIndex, 0, newMeasure);
      
      // 重新编号所有小节
      for (let i = 0; i < newMeasures.length; i++) {
        newMeasures[i].number = i + 1;
      }
      
      // 确保总小节数是4的倍数（4/4拍）
      const beatsPerMeasure = 4; // 4/4拍中每小节有4拍
      const currentMeasureCount = newMeasures.length;
      const targetMeasureCount = Math.ceil(currentMeasureCount / beatsPerMeasure) * beatsPerMeasure;
      
      // 如果当前小节数不是4的倍数，添加额外的小节
      if (currentMeasureCount < targetMeasureCount) {
        const lastMeasure = newMeasures[newMeasures.length - 1];
        const measureDuration = lastMeasure.endTime - lastMeasure.startTime;
        
        // 添加额外的小节，使总数为4的倍数
        for (let i = currentMeasureCount; i < targetMeasureCount; i++) {
          const prevMeasure = newMeasures[i - 1];
          const startTime = prevMeasure.endTime;
          const endTime = startTime + measureDuration;
          
          newMeasures.push({
            number: i + 1,
            chord: state.analysisResult.key || 'C', // 使用调性和弦作为默认
            startTime: startTime,
            endTime: endTime
          });
        }
        
        // 更新段落的结束时间
        structure.endTime = newMeasures[newMeasures.length - 1].endTime;
      }
      
      newStructures[structureIndex] = {
        ...structure,
        measures: newMeasures
      };
      
      return {
        analysisResult: {
          ...state.analysisResult,
          structures: newStructures
        },
        hasUserEdits: true
      };
    });
  },

  removeMeasure: (structureIndex: number, measureIndex: number) => {
    set(state => {
      if (!state.analysisResult) return state;
      
      const newStructures = [...state.analysisResult.structures];
      const structure = newStructures[structureIndex];
      
      if (!structure) return state;
      
      const newMeasures = [...structure.measures];
      
      if (newMeasures.length <= 1) {
        return state;
      }
      
      newMeasures.splice(measureIndex, 1);
      
      for (let i = 0; i < newMeasures.length; i++) {
        newMeasures[i].number = i + 1;
      }
      
      newStructures[structureIndex] = {
        ...structure,
        measures: newMeasures
      };
      
      return {
        analysisResult: {
          ...state.analysisResult,
          structures: newStructures
        },
        hasUserEdits: true
      };
    });
  },

  resetAnalysis: () => {
    const { audioFile } = get();
    
    if (!audioFile) {
      return;
    }
    
    get().startProcessing();
  },

  duplicateStructure: (index: number) => {
    const state = get();
    if (!state.analysisResult) return;
    
    const structures = [...state.analysisResult.structures];
    const structureToDuplicate = structures[index];
    
    if (!structureToDuplicate) return;
    
    // 创建深拷贝以避免引用问题
    const duplicatedStructure = {
      ...structureToDuplicate,
      measures: structureToDuplicate.measures.map(measure => ({
        ...measure,
        number: measure.number // 保持原始编号
      }))
    };
    
    // 插入复制的段落在原始段落之后
    structures.splice(index + 1, 0, duplicatedStructure);
    
    // 更新结果
    set({
      analysisResult: {
        ...state.analysisResult,
        structures,
      },
      hasUserEdits: true,
    });
  },

  reorderStructures: (fromIndex: number, toIndex: number) => {
    const state = get();
    if (!state.analysisResult) return;
    
    const structures = [...state.analysisResult.structures];
    
    // 确保索引有效
    if (fromIndex < 0 || fromIndex >= structures.length || toIndex < 0 || toIndex >= structures.length) {
      return;
    }
    
    // 移动段落
    const [movedStructure] = structures.splice(fromIndex, 1);
    structures.splice(toIndex, 0, movedStructure);
    
    // 更新结果
    set({
      analysisResult: {
        ...state.analysisResult,
        structures,
      },
      hasUserEdits: true,
    });
  },

  setSelectedTimeStart: (time: number | null) => {
    set(state => {
      const currentRange = state.selectedTimeRange || { start: null, end: null };
      return {
        selectedTimeRange: { 
          ...currentRange,
          start: time 
        }
      };
    });
  },

  setSelectedTimeEnd: (time: number | null) => {
    set(state => {
      const currentRange = state.selectedTimeRange || { start: null, end: null };
      return {
        selectedTimeRange: { 
          ...currentRange,
          end: time 
        }
      };
    });
  },

  clearSelectedTimeRange: () => {
    set({ selectedTimeRange: null });
  },

  createStructureFromTimeRange: (type: SectionType) => {
    const state = get();
    if (!state.analysisResult || !state.selectedTimeRange) return;
    
    const { start, end } = state.selectedTimeRange;
    if (start === null || end === null || start >= end) {
      console.error("无效的时间区间:", start, end);
      return;
    }
    
    // 创建新的段落
    const newStructure: SongStructure = {
      type,
      startTime: start,
      endTime: end,
      measures: []
    };
    
    // 获取原始分析结果中的所有小节数据
    const allMeasures: { measure: Measure, structureIndex: number }[] = [];
    state.analysisResult.structures.forEach((structure, structureIndex) => {
      structure.measures.forEach(measure => {
        allMeasures.push({ measure, structureIndex });
      });
    });
    
    // 将小节按照开始时间排序
    allMeasures.sort((a, b) => a.measure.startTime - b.measure.startTime);
    
    // 获取选定时间范围内的所有小节
    const measuresInRange = allMeasures.filter(
      (item: { measure: Measure, structureIndex: number }) => {
        const measure = item.measure;
        // 完全包含在区间内
        if (measure.startTime >= start && measure.endTime <= end) {
          return true;
        }
        // 部分重叠 - 开始时间在区间内
        if (measure.startTime >= start && measure.startTime < end) {
          return true;
        }
        // 部分重叠 - 结束时间在区间内
        if (measure.endTime > start && measure.endTime <= end) {
          return true;
        }
        // 区间完全被小节包含
        if (measure.startTime <= start && measure.endTime >= end) {
          return true;
        }
        return false;
      }
    );
    
    // 获取当前段落的节拍类型和小节长度
    // 尝试从音频分析结果中获取节拍信息
    const beatsInfo = state.analysisResult.beats;
    // 默认使用4/4拍，每小节为4拍
    const beatsPerMeasure = beatsInfo?.beatsPerBar || 4;
    
    if (measuresInRange.length > 0) {
      console.log(`找到${measuresInRange.length}个与时间区间[${start.toFixed(2)}-${end.toFixed(2)}]s重叠的小节`);
      
      // 添加匹配到的所有小节，调整其开始和结束时间
      measuresInRange.forEach((item, index) => {
        const { measure } = item;
        const adjustedStartTime = Math.max(measure.startTime, start);
        const adjustedEndTime = Math.min(measure.endTime, end);
        
        newStructure.measures.push({
          number: index + 1,
          chord: measure.chord,
          startTime: adjustedStartTime,
          endTime: adjustedEndTime
        });
      });
      
      // 确保小节数符合音乐理论 (按照节拍类型确定小节数倍数)
      const currentMeasureCount = newStructure.measures.length;
      const targetMeasureCount = Math.ceil(currentMeasureCount / beatsPerMeasure) * beatsPerMeasure;
      
      if (currentMeasureCount < targetMeasureCount) {
        // 需要添加额外的小节以满足要求
        const lastMeasure = newStructure.measures[newStructure.measures.length - 1];
        const measureDuration = lastMeasure ? (lastMeasure.endTime - lastMeasure.startTime) : 2.0;
        const defaultChord = lastMeasure ? lastMeasure.chord : (state.analysisResult.key || 'C');
        
        for (let i = currentMeasureCount; i < targetMeasureCount; i++) {
          const prevEndTime = i > 0 ? newStructure.measures[i-1].endTime : end;
          newStructure.measures.push({
            number: i + 1,
            chord: defaultChord,
            startTime: prevEndTime,
            endTime: prevEndTime + measureDuration
          });
        }
        
        // 更新段落结束时间
        newStructure.endTime = newStructure.measures[newStructure.measures.length - 1].endTime;
      }
    } else {
      console.log(`未找到与时间区间[${start.toFixed(2)}-${end.toFixed(2)}]s重叠的小节，尝试根据区间推断和弦`);
      
      // 未找到匹配的小节，尝试根据区间推断和弦
      let defaultChord = state.analysisResult.key || 'C';
      let measureDuration = 2.0; // 默认小节时长
      
      // 查找最接近的小节
      if (allMeasures.length > 0) {
        // 将allMeasures转换成正确的类型
        const typedMeasures = allMeasures.map(item => {
          // 确保item有正确的结构
          if ('measure' in item && 'structureIndex' in item) {
            return {
              measure: item.measure as Measure,
              structureIndex: item.structureIndex as number
            };
          }
          return null;
        }).filter(item => item !== null) as {
          measure: Measure;
          structureIndex: number;
        }[];
        
        // 找到最接近的小节
        if (typedMeasures.length > 0) {
          const rangeMidpoint = (start + end) / 2;
          
          let closestMeasure: Measure | null = null;
          let minDistance = Infinity;
          
          for (const item of typedMeasures) {
            const measureMidpoint = (item.measure.startTime + item.measure.endTime) / 2;
            const distance = Math.abs(measureMidpoint - rangeMidpoint);
            
            if (distance < minDistance) {
              closestMeasure = item.measure;
              minDistance = distance;
            }
          }
          
          if (closestMeasure) {
            defaultChord = closestMeasure.chord;
            measureDuration = closestMeasure.endTime - closestMeasure.startTime;
            console.log(`使用最近小节的和弦: ${defaultChord}`);
          }
        }
      }
      
      // 尝试使用拍子信息来计算小节
      let numberOfMeasures = 4; // 默认值

      if (beatsInfo && beatsInfo.positions.length > 0) {
        // 如果有beat位置信息，尝试找出时间区间内的beat数量
        const beatsInRange = beatsInfo.positions.filter(pos => pos >= start && pos <= end);
        // 根据beat数量计算需要的小节数，确保小节数是拍子数的倍数
        numberOfMeasures = Math.ceil(beatsInRange.length / beatsPerMeasure) * beatsPerMeasure;
        console.log(`区间内检测到${beatsInRange.length}个拍子，调整为${numberOfMeasures}个小节`);
      } else {
        // 计算区间中应该包含多少小节
        const rawMeasureCount = Math.ceil((end - start) / measureDuration);
        // 确保小节数是beatsPerMeasure的倍数
        numberOfMeasures = Math.ceil(rawMeasureCount / beatsPerMeasure) * beatsPerMeasure;
      }
      
      console.log(`调整后的小节数: ${numberOfMeasures} (${beatsPerMeasure}拍的倍数)`);
      
      // 调整每个小节的时长以适应总区间长度
      const adjustedMeasureDuration = (end - start) / numberOfMeasures;
      
      // 创建小节
      for (let i = 0; i < numberOfMeasures; i++) {
        const measureStart = start + (i * adjustedMeasureDuration);
        const measureEnd = i < numberOfMeasures - 1 
          ? start + ((i + 1) * adjustedMeasureDuration)
          : end; // 确保最后一个小节刚好结束于区间结束时间
        
        newStructure.measures.push({
          number: i + 1,
          chord: defaultChord,  // 使用推断的和弦
          startTime: measureStart,
          endTime: measureEnd
        });
      }
    }
    
    // 确保小节按开始时间排序
    newStructure.measures.sort((a, b) => a.startTime - b.startTime);
    
    // 修正小节编号
    newStructure.measures.forEach((measure, index) => {
      measure.number = index + 1;
    });
    
    // 找到应该插入新段落的位置
    const structures = [...state.analysisResult.structures];
    let insertIndex = 0;
    
    // 根据开始时间查找插入位置
    while (insertIndex < structures.length && structures[insertIndex].startTime < start) {
      insertIndex++;
    }
    
    // 插入新段落
    structures.splice(insertIndex, 0, newStructure);
    
    // 更新结果
    set({
      analysisResult: {
        ...state.analysisResult,
        structures
      },
      hasUserEdits: true,
      selectedTimeRange: null  // 重置选定区间
    });
  },

  setCurrentTool: (tool: EditTool) => {
    const state = get();
    set({ currentTool: tool });
    
    // 只有当切换到非选择相关工具时才清除选择状态
    if (tool !== 'selector' && tool !== 'createSection') {
      set({
        selection: {
          isSelecting: false,
          startIndex: null,
          endIndex: null,
          selectedMeasureIds: []
        }
      });
    }
  },

  selectMeasure: (measureId: string, isMultiSelect = false) => {
    const { selection, analysisResult } = get();
    
    if (!analysisResult) return;
    
    if (!isMultiSelect) {
      set({ 
        selection: {
          ...selection,
          selectedMeasureIds: [measureId]
        }
      });
      return;
    }
    
    const selectedIds = [...selection.selectedMeasureIds];
    const index = selectedIds.indexOf(measureId);
    
    if (index === -1) {
      selectedIds.push(measureId);
    } else {
      selectedIds.splice(index, 1);
    }
    
    set({
      selection: {
        ...selection,
        selectedMeasureIds: selectedIds
      }
    });
  },

  clearSelection: () => {
    set({
      selection: {
        isSelecting: false,
        startIndex: null,
        endIndex: null,
        selectedMeasureIds: []
      }
    });
  },

  startSelection: (index: number) => set({
    selection: {
      isSelecting: true,
      startIndex: index,
      endIndex: index,
      selectedMeasureIds: []
    }
  }),

  updateSelection: (index: number) => {
    const { selection, analysisResult } = get();
    if (!selection.isSelecting || !analysisResult || selection.startIndex === null) return;
    
    // 获取所有小节编号
    const allBarNumbers: { barNumber: number, id: string }[] = [];
    const processedBars = new Set<number>();
    
    // 收集所有小节编号及其ID
    analysisResult.structures.forEach(structure => {
      // 从原始数据中获取和弦地图
      const chordsMap = analysisResult.raw_data?.['chords map'] || [];
      
      if (chordsMap && chordsMap.length > 0) {
        chordsMap.forEach((chord: any) => {
          if (chord.start_bar !== undefined && chord.end_bar !== undefined) {
            // 为每个小节生成一个ID
            for (let i = chord.start_bar; i < chord.end_bar; i++) {
              if (!processedBars.has(i)) {
                processedBars.add(i);
                allBarNumbers.push({
                  barNumber: i,
                  id: `bar-${i}`
                });
              }
            }
          }
        });
      }
    });
    
    // 按小节编号排序
    allBarNumbers.sort((a, b) => a.barNumber - b.barNumber);
    
    // 计算选择的范围边界
    const startIdx = Math.min(selection.startIndex, index);
    const endIdx = Math.max(selection.startIndex, index);
    
    // 计算实际的小节编号范围
    const startBarNumber = startIdx + 1; // 因为小节编号从1开始，而索引从0开始
    const endBarNumber = endIdx + 1;
    
    // 获取范围内所有小节的ID
    const selectedMeasureIds = allBarNumbers
      .filter(item => item.barNumber >= startBarNumber && item.barNumber <= endBarNumber)
      .map(item => item.id);
    
    console.log(`框选范围: ${startBarNumber}-${endBarNumber}，选中了${selectedMeasureIds.length}个小节`);
    
    // 更新选择状态
    set({
      selection: {
        ...selection,
        endIndex: index,
        selectedMeasureIds
      }
    });
  },

  endSelection: () => {
    const { selection } = get();
    
    // 仅更新选择状态，保留已选择的小节
    set({
      selection: {
        ...selection,
        isSelecting: false
      }
    });
  },

  openSectionDialog: () => {
    const { selection } = get();
    if (selection.selectedMeasureIds.length === 0) {
      console.warn('没有选中的小节，无法创建段落');
      return;
    }
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-section-dialog'));
    }
  },

  closeSectionDialog: () => {
    // 此函数现在无需实现，由SectionDialog组件自己管理
  },

  setSectionType: (type: SectionType) => {
    set({ selectedSectionType: type });
  },

  createSection: () => {
    const { selection, analysisResult, selectedSectionType } = get();
    
    // 检查前置条件
    if (!analysisResult || selection.selectedMeasureIds.length === 0 || !selectedSectionType) {
      console.log("创建段落失败：缺少必要条件", { 
        hasResult: !!analysisResult, 
        selectedIds: selection.selectedMeasureIds.length,
        selectedType: selectedSectionType
      });
      return;
    }
    
    console.log("开始创建段落，选中的ID:", selection.selectedMeasureIds);
    
    // 提取选中ID对应的小节编号
    const selectedBarNumbers = selection.selectedMeasureIds
      .filter(id => id.startsWith('bar-'))
      .map(id => {
        const match = id.match(/bar-(\d+)/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(n => n !== null) as number[];
    
    if (selectedBarNumbers.length === 0) {
      console.log("选中的ID中没有有效的小节编号");
      return;
    }
    
    console.log("解析出的小节编号:", selectedBarNumbers);
    
    // 找到Any类型的段落
    const anyStructure = analysisResult.structures.find(s => s.type === 'Any');
    if (!anyStructure) {
      console.log("找不到Any类型的结构，无法创建段落");
      return;
    }
    
    // 创建新段落的ID
    const newSectionId = uuidv4();
    
    // 检查是否存在bars_list
    if (!analysisResult.bars_list || analysisResult.bars_list.length === 0) {
      console.log("缺少bars_list数据，无法创建段落");
      return;
    }
    
    // 打印bars_list信息
    console.log(`bars_list包含 ${analysisResult.bars_list.length} 个小节数据`);
    
    // 深拷贝bars_list以便安全修改
    const updatedBarsList = [...analysisResult.bars_list];
    
    // 收集所有被选中小节的信息
    const selectedBars = updatedBarsList.filter(bar => selectedBarNumbers.includes(bar.number));
    
    console.log(`在bars_list中选中了 ${selectedBars.length} 个小节, 编号:`, 
      selectedBars.map(b => b.number));
    
    if (selectedBars.length === 0) {
      console.log("在bars_list中找不到选中的小节");
      return;
    }
    
    // 更新bars_list中选中小节的structureId
    for (const bar of updatedBarsList) {
      if (selectedBarNumbers.includes(bar.number)) {
        bar.structureId = newSectionId;
      }
    }
    
    console.log(`更新了${selectedBars.length}个小节在bars_list中的所属段落ID`);
    
    // 从Any段落的measures中提取选中的小节
    const beforeMeasuresCount = anyStructure.measures.length;
    const anyMeasures = anyStructure.measures;
    
    // 新的Any段落measures：排除选中的小节
    const remainingMeasures = anyMeasures.filter(measure => {
      // 首先检查measure是否有明确的number属性
      if (typeof measure.number !== 'number') {
        return true; // 保留没有明确编号的小节
      }
      
      // 严格匹配：只移除编号完全匹配的小节
      const shouldKeep = !selectedBarNumbers.includes(measure.number);
      if (!shouldKeep) {
        console.log(`从Any段落中移除小节 #${measure.number}`);
      }
      return shouldKeep;
    });
    
    // 直接从bars_list中提取对应的小节，创建新段落的measures
    const selectedMeasures: Measure[] = selectedBars.map(bar => ({
      id: uuidv4(),
      number: bar.number,
      chord: bar.chord,
      startTime: bar.startTime,
      endTime: bar.endTime,
      structureId: newSectionId,
      barSpan: 1, // 确保每个小节都是独立的
      bars: 1     // 确保每个小节都是独立的
    }));
    
    // 按小节编号排序
    selectedMeasures.sort((a, b) => a.number - b.number);
    
    // 创建新段落
    const newSection: SongStructure = {
      id: newSectionId,
      type: selectedSectionType,
      startTime: Math.min(...selectedMeasures.map(m => m.startTime)),
      endTime: Math.max(...selectedMeasures.map(m => m.endTime)),
      measures: selectedMeasures
    };
    
    // 更新Any结构
    const updatedAnyStructure: SongStructure = {
      ...anyStructure,
      measures: remainingMeasures
    };
    
    // 更新结构列表
    const newStructures = analysisResult.structures
      .filter(s => s.id !== anyStructure.id)
      .concat([updatedAnyStructure, newSection])
      .sort((a, b) => a.startTime - b.startTime);
    
    // 再次检查小节数量是否符合预期
    console.log(`新段落 ${selectedSectionType} 包含 ${newSection.measures.length} 个小节`);
    console.log(`更新后Any段落包含 ${updatedAnyStructure.measures.length} 个小节`);
    console.log(`原始Any段落有 ${anyStructure.measures.length} 个小节，选中了 ${selectedBarNumbers.length} 个小节`);
    console.log(`预期Any段落应该剩余 ${anyStructure.measures.length - selectedBarNumbers.length} 个小节`);
    
    // 更新状态
    set({
      analysisResult: {
        ...analysisResult,
        structures: newStructures,
        bars_list: updatedBarsList
      },
      selection: {
        isSelecting: false,
        startIndex: null,
        endIndex: null,
        selectedMeasureIds: []
      }
    });
    
    console.log(`已创建${selectedSectionType}段落，包含${selectedMeasures.length}个完全独立的小节`);
  },

  removeSection: (sectionId: string) => {
    const { analysisResult } = get();
    if (!analysisResult) return;
    
    // 找到要解散的段落
    const sectionToRemove = analysisResult.structures.find(s => s.id === sectionId);
    if (!sectionToRemove) return;
    
    // 收集需要回归到Any段落的小节编号
    const barsToRestore: number[] = [];
    sectionToRemove.measures.forEach(measure => {
      if (typeof measure.number === 'number') {
        barsToRestore.push(measure.number);
      }
    });
    
    console.log(`解散段落 ${sectionToRemove.type}，包含 ${barsToRestore.length} 个小节编号`);
    
    // 查找现有的"Any"类型段落
    const existingAnyStructure = analysisResult.structures.find(s => s.type === 'Any' && s.id !== sectionId);
    
    // 确保存在Any段落
    if (!existingAnyStructure) {
      console.log("找不到Any类型的结构，无法解散段落");
      return;
    }
    
    // 确保存在bars_list
    if (!analysisResult.bars_list || analysisResult.bars_list.length === 0) {
      console.log("缺少bars_list数据，无法解散段落");
      return;
    }
    
    // 获取Any段落ID
    const anyStructureId = existingAnyStructure.id || uuidv4();
    
    // 深拷贝bars_list以便安全修改
    const updatedBarsList = [...analysisResult.bars_list];
    
    // 更新bars_list中被解散段落的小节的structureId
    let updatedBarsCount = 0;
    for (const barNode of updatedBarsList) {
      if (barsToRestore.includes(barNode.number)) {
        barNode.structureId = anyStructureId;
        updatedBarsCount++;
      }
    }
    
    console.log(`已更新${updatedBarsCount}个小节在bars_list中的所属段落ID`);
    
    // 将解散段落的小节转换为Measure对象，添加到Any段落
    const measuresToRestore = barsToRestore
      .map(barNumber => {
        const barNode = updatedBarsList.find(bar => bar.number === barNumber);
        if (!barNode) return null;
        
        return {
          id: uuidv4(),
          number: barNumber,
          chord: barNode.chord,
          startTime: barNode.startTime,
          endTime: barNode.endTime,
          structureId: anyStructureId,
          barSpan: 1, // 确保每个小节都是独立的
          bars: 1     // 确保每个小节都是独立的
        } as Measure;
      })
      .filter(measure => measure !== null) as Measure[];
    
    // 合并小节到现有Any段落
    const mergedAnyStructure = {
      ...existingAnyStructure,
      id: anyStructureId,
      // 更新时间范围，确保覆盖所有小节
      startTime: Math.min(existingAnyStructure.startTime, 
                          measuresToRestore.length > 0 ? Math.min(...measuresToRestore.map(m => m.startTime)) : Infinity),
      endTime: Math.max(existingAnyStructure.endTime, 
                        measuresToRestore.length > 0 ? Math.max(...measuresToRestore.map(m => m.endTime)) : 0),
      // 合并小节 - 确保每个小节都是独立的
      measures: [...existingAnyStructure.measures, ...measuresToRestore]
    };
    
    // 更新结构列表，移除旧的解散段落和Any段落，添加合并后的Any段落
    const updatedStructures = analysisResult.structures
      .filter(s => s.id !== sectionId && s.id !== existingAnyStructure.id)
      .concat(mergedAnyStructure)
      .sort((a, b) => a.startTime - b.startTime);
      
    console.log(`已将解散的小节合并到Any段落，现在Any段落共有 ${mergedAnyStructure.measures.length} 个小节`);
    
    // 更新状态
    set({
      analysisResult: {
        ...analysisResult,
        structures: updatedStructures,
        bars_list: updatedBarsList
      },
      selection: {
        isSelecting: false,
        startIndex: null,
        endIndex: null,
        selectedMeasureIds: []
      }
    });
  },

  updateMeasureChord: (measureId: string, newChord: string) => {
    const { analysisResult } = get();
    if (!analysisResult) return;
    
    // 记录要更新的和弦位置信息
    let targetStructureIndex = -1;
    let targetMeasureIndex = -1;
    let targetMeasure: Measure | null = null;
    
    // 遍历所有段落找到指定ID的小节
    const updatedStructures = analysisResult.structures.map((structure, structureIndex) => {
      // 查找该段落内的目标小节
      const updatedMeasures = structure.measures.map((measure, measureIndex) => {
        if (measure.id === measureId) {
          // 找到目标小节，记录位置
          targetStructureIndex = structureIndex;
          targetMeasureIndex = measureIndex;
          targetMeasure = { ...measure };
          
          // 更新和弦名称
          return {
            ...measure,
            chord: newChord
          };
        }
        return measure;
      });
      
      // 返回更新后的段落
      return {
        ...structure,
        measures: updatedMeasures
      };
    });
    
    // 不再进行相邻和弦的自动合并
    
    // 更新状态
    set({
      analysisResult: {
        ...analysisResult,
        structures: updatedStructures
      },
      hasUserEdits: true
    });
    
    console.log(`已更新小节 ${measureId} 的和弦为 ${newChord}`);
  },

  updateBarChord: (barNumber: number, newChord: string) => {
    const { analysisResult } = get();
    if (!analysisResult || !analysisResult.raw_data) return;
    
    // 获取和弦图数据
    const chordsMap = analysisResult.raw_data['chords map'] || [];
    if (!chordsMap.length) {
      console.log('没有可用的和弦数据');
      return;
    }
    
    // 找到对应该小节的和弦
    const targetChord = chordsMap.find((chord: any) => {
      return chord.start_bar <= barNumber && chord.end_bar > barNumber;
    });
    
    // 如果找不到匹配的和弦，直接返回
    if (!targetChord) {
      console.log(`找不到对应小节 ${barNumber} 的和弦`);
      return;
    }
    
    // 修改和弦的值
    targetChord.chord_basic_pop = newChord;
    targetChord.chord_majmin = newChord;
    
    // 更新状态
    set({
      analysisResult: {
        ...analysisResult,
        raw_data: {
          ...analysisResult.raw_data,
          'chords map': chordsMap
        }
      },
      hasUserEdits: true
    });
    
    console.log(`已更新小节 ${barNumber} 的和弦为 ${newChord}`);
  },

  // 添加导出PDF的方法
  exportToPdf: async () => {
    const { analysisResult } = get();
    
    if (!analysisResult) {
      set({ exportPdfError: '没有可导出的分析结果' });
      return;
    }
    
    set({ 
      isPdfExporting: true,
      exportPdfError: null
    });
    
    try {
      // 导出逻辑在PdfExport组件中实现
      // 这里仅设置状态
      
      set({ isPdfExporting: false });
    } catch (error) {
      console.error('PDF导出错误:', error);
      set({ 
        isPdfExporting: false,
        exportPdfError: error instanceof Error ? error.message : '导出PDF时发生未知错误'
      });
    }
  },

  // 从段落中移除单个小节
  removeBarFromSection: () => {
    const { analysisResult, selection } = get();
    if (!analysisResult) return;
    
    // 检查是否只有一个小节被选中
    if (selection.selectedMeasureIds.length !== 1) {
      console.log("需要选择单个小节才能从段落中移除");
      return;
    }
    
    // 获取选中的小节ID
    const selectedId = selection.selectedMeasureIds[0];
    if (!selectedId.startsWith('bar-')) {
      console.log("选中的不是小节ID");
      return;
    }
    
    // 提取小节编号
    const match = selectedId.match(/bar-(\d+)/);
    if (!match) {
      console.log("无法解析小节编号");
      return;
    }
    
    const barNumber = parseInt(match[1]);
    console.log(`准备移除小节 #${barNumber}`);
    
    // 查找Any段落
    const anyStructure = analysisResult.structures.find(s => s.type === 'Any');
    if (!anyStructure) {
      console.log("找不到Any类型的段落，无法移除小节");
      return;
    }
    
    // 查找小节所在的段落
    const structures = analysisResult.structures;
    let sourceStructure: SongStructure | undefined = undefined;
    let sourceMeasure: Measure | undefined = undefined;
    let sourceStructureIndex = -1;
    let sourceMeasureIndex = -1;
    
    // 遍历所有段落查找小节
    for (let i = 0; i < structures.length; i++) {
      const structure = structures[i];
      
      for (let j = 0; j < structure.measures.length; j++) {
        const measure = structure.measures[j];
        if (measure.number === barNumber) {
          sourceStructure = structure;
          sourceMeasure = measure;
          sourceStructureIndex = i;
          sourceMeasureIndex = j;
          break;
        }
      }
      if (sourceStructure) break;
    }
    
    // 如果找不到小节，输出错误信息并返回
    if (!sourceStructure || !sourceMeasure) {
      console.log(`找不到小节 #${barNumber} 所在的段落`);
      return;
    }
    
    // 如果小节已在Any段落中，直接从Any段落移除
    if (sourceStructure.type === 'Any') {
      console.log(`小节 #${barNumber} 已经在Any段落中，将直接移除`);
      
      // 确保存在bars_list
      if (!analysisResult.bars_list || analysisResult.bars_list.length === 0) {
        console.log("缺少bars_list数据，无法移除小节");
        return;
      }
      
      // 深拷贝所有结构
      const updatedStructures = [...analysisResult.structures];
      
      // 从Any段落中移除小节
      const updatedAnyMeasures = [...updatedStructures[sourceStructureIndex].measures];
      updatedAnyMeasures.splice(sourceMeasureIndex, 1);
      
      // 更新Any段落
      updatedStructures[sourceStructureIndex] = {
        ...updatedStructures[sourceStructureIndex],
        measures: updatedAnyMeasures
      };
      
      // 更新状态
      set({
        analysisResult: {
          ...analysisResult,
          structures: updatedStructures
        },
        selection: {
          isSelecting: false,
          startIndex: null,
          endIndex: null,
          selectedMeasureIds: []
        },
        hasUserEdits: true
      });
      
      console.log(`已从Any段落中移除小节 #${barNumber}`);
      return;
    }
    
    console.log(`找到小节 #${barNumber} 在段落 ${sourceStructure.type} 中`);
    
    // 确保存在bars_list
    if (!analysisResult.bars_list || analysisResult.bars_list.length === 0) {
      console.log("缺少bars_list数据，无法移除小节");
      return;
    }
    
    // 深拷贝所有结构和bars_list以便安全修改
    const updatedStructures = [...analysisResult.structures];
    const updatedBarsList = [...analysisResult.bars_list];
    
    // 从源段落中移除小节
    const updatedSourceMeasures = [...updatedStructures[sourceStructureIndex].measures];
    updatedSourceMeasures.splice(sourceMeasureIndex, 1);
    
    // 更新源段落
    updatedStructures[sourceStructureIndex] = {
      ...updatedStructures[sourceStructureIndex],
      measures: updatedSourceMeasures
    };
    
    // 创建要添加到Any段落的新小节对象
    const newMeasure: Measure = {
      id: uuidv4(),
      number: barNumber,
      chord: sourceMeasure.chord,
      startTime: sourceMeasure.startTime,
      endTime: sourceMeasure.endTime,
      structureId: anyStructure.id,
      barSpan: 1,
      bars: 1
    };
    
    // 将小节添加到Any段落
    const anyStructureIndex = updatedStructures.findIndex(s => s.type === 'Any');
    updatedStructures[anyStructureIndex] = {
      ...updatedStructures[anyStructureIndex],
      measures: [...updatedStructures[anyStructureIndex].measures, newMeasure]
    };
    
    // 更新bars_list中的structureId
    for (const barNode of updatedBarsList) {
      if (barNode.number === barNumber) {
        barNode.structureId = anyStructure.id;
        console.log(`已更新小节 #${barNumber} 在bars_list中的所属段落ID`);
        break;
      }
    }
    
    // 更新状态
    set({
      analysisResult: {
        ...analysisResult,
        structures: updatedStructures,
        bars_list: updatedBarsList
      },
      selection: {
        isSelecting: false,
        startIndex: null,
        endIndex: null,
        selectedMeasureIds: []
      },
      hasUserEdits: true
    });
    
    console.log(`已将小节 #${barNumber} 从段落 ${sourceStructure.type} 移动到Any段落`);
  },

  // 切换每行小节数（4或8）
  toggleBarsPerRow: () => {
    const { barsPerRow } = get();
    // 在4和8之间切换
    set({ barsPerRow: barsPerRow === 8 ? 4 : 8 });
    console.log(`每行小节数已更改为: ${barsPerRow === 8 ? 4 : 8}`);
  }
}));

// 添加事件监听器来处理段落创建
if (typeof window !== 'undefined') {
  window.addEventListener('create-section', (e: Event) => {
    const customEvent = e as CustomEvent<{ type: SectionType }>
    const store = useAudioStore.getState()
    
    // 获取要创建的段落类型
    const sectionType = customEvent.detail?.type
    if (!sectionType) {
      console.log('没有指定段落类型，无法创建段落')
      return
    }
    
    // 更新存储中的段落类型，然后调用createSection方法
    store.setSectionType(sectionType)
    store.createSection()
  })
} 