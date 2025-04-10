export interface AudioAnalysisResult {
  key: string;             // 调性，如 "C", "G", "Am" 等
  tempo: number;           // 速度（BPM）
  structures: SongStructure[];  // 段落结构列表
  beats?: BeatInfo;         // 添加节拍信息字段
  raw_data?: Record<string, any>; // 添加原始数据字段
  bars_list?: BarNode[];   // 添加独立的小节列表，确保每个小节独立存在
  songTitle?: string;      // 歌曲名称
}

export interface SongStructure {
  type: SectionType;       // 段落类型
  startTime: number;       // 开始时间（秒）
  endTime: number;         // 结束时间（秒）
  measures: Measure[];     // 小节列表
  id?: string;             // 唯一标识符，用于编辑操作
}

export type SectionType = 
  | 'Intro' 
  | 'Verse' 
  | 'Chorus' 
  | 'Bridge' 
  | 'Solo' 
  | 'Outro'
  | 'Any';

export interface Measure {
  number: number;          // 小节编号
  chord: string;           // 和弦名称
  startTime: number;       // 开始时间（秒）
  endTime: number;         // 结束时间（秒）
  barSpan?: number;         // 和弦跨越的小节数量，默认为1
  bars?: number;           // 同barSpan，显示用，对应end_bar - start_bar
  id?: string;             // 唯一标识符，用于编辑操作
  structureId?: string;    // 所属段落的ID
  isSelected?: boolean;    // 是否被选中
}

export interface AudioProcessingState {
  vocalRemovedFile: File | null;
  isProcessing: boolean;
  processingStep: ProcessingStep;
  processingProgress: number;
  analysisResult: AudioAnalysisResult | null;
  error: string | null;
}

export type ProcessingStep = 
  | 'idle'
  | 'removing-vocals'
  | 'analyzing-key-tempo'
  | 'analyzing-structure'
  | 'analyzing-chords'
  | 'complete'
  | 'error';

// 新增节拍信息接口
export interface BeatInfo {
  positions: number[];  // 拍子位置数组（秒）
  bpm: number;         // 精确的每分钟拍数
  timeSignature: string; // 节拍类型，如 "4/4", "3/4" 等
  beatsPerBar: number;  // 每小节的拍数
}

// 编辑相关类型定义
// 编辑工具类型
export type EditTool = 'selector' | 'createSection' | 'removeSection' | 'editChord';

// 段落创建对话框状态
export interface SectionDialogState {
  isDialogOpen: boolean;
  selectedSectionType: SectionType | null;
}

// 选择状态
export interface SelectionState {
  isSelecting: boolean;
  startIndex: number | null;
  endIndex: number | null;
  selectedMeasureIds: string[];
}

// 新增独立小节节点接口
export interface BarNode {
  id: string;              // 小节的唯一ID
  number: number;          // 小节编号
  chord: string;           // 和弦名称
  startTime: number;       // 开始时间（秒）
  endTime: number;         // 结束时间（秒）
  structureId?: string;    // 所属段落的ID，用于确定该小节属于哪个段落
  isSelected?: boolean;    // 是否被选中
} 