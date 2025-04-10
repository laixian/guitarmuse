'use client'

import { AudioAnalysisResult, SectionType, SongStructure, Measure } from '../types/audio'
import { analyzeAudioClient, detectKeySimple } from './audio-analyzer-adapter'

// 完整的音频处理流程 - 使用服务端API
export const processAudio = async (audioFile: File, detectedKey: string = 'E'): Promise<{
  vocalRemovedFile: File,
  analysisResult: AudioAnalysisResult
}> => {
  try {
    // 步骤1: 创建用于上传的表单数据
    const formData = new FormData();
    formData.append('audio', audioFile);
    // 注意：不再发送键值，由服务端自行检测
    
    // 步骤2: 并行处理人声移除和音频分析
    const [vocalRemovedResponse, analysisResult] = await Promise.all([
      // 调用服务端人声移除API
      fetch('/api/vocal-removal', {
        method: 'POST',
        body: formData,
      }),
      
      // 调用服务端音频分析API - 使用适配器（不传递调性参数）
      analyzeAudioClient(formData)
    ]);
    
    // 检查人声移除响应
    if (!vocalRemovedResponse.ok) {
      const errorData = await vocalRemovedResponse.json();
      throw new Error(errorData.error || '人声移除失败');
    }
    
    // 读取处理后的音频文件
    const vocalRemovedBlob = await vocalRemovedResponse.blob();
    const vocalRemovedFile = new File(
      [vocalRemovedBlob],
      'vocal-removed.wav',
      { type: vocalRemovedBlob.type || 'audio/wav' }
    );
    
    // 使用客户端检测的调性，如果服务端没有返回调性
    if (analysisResult && !analysisResult.key) {
      analysisResult.key = detectedKey;
    }
    
    // 返回处理结果
    return {
      vocalRemovedFile,
      analysisResult
    };
  } catch (error) {
    console.error('音频处理失败:', error);
    throw error;
  }
};

// 根据调性调整和弦
function adjustChordsToMatchKey(structures: SongStructure[], key: string): void {
  // 这里可以根据实际需要实现更复杂的和弦转换
  // 此处仅作简单示例
  console.log(`调整和弦以匹配调性: ${key}`);
}

// 备用处理方法 - 当服务端处理失败时使用
export const processFallback = async (audioFile: File, detectedKey: string = 'E'): Promise<{
  vocalRemovedFile: File,
  analysisResult: AudioAnalysisResult
}> => {
  try {
    // 直接使用原始文件
    const vocalRemovedFile = new File([audioFile], 'vocal-removed.mp3', { type: audioFile.type });
    
    // 生成模拟的分析结果，使用指定的调性
    const analysisResult = generateMockAnalysisResult(detectedKey);
    
    return {
      vocalRemovedFile,
      analysisResult
    };
  } catch (error) {
    console.error('备用处理出错:', error);
    throw new Error('音频处理失败');
  }
};

// 生成模拟的分析结果
function generateMockAnalysisResult(key: string = 'E'): AudioAnalysisResult {
  const structures: SongStructure[] = [
    {
      type: 'Intro' as SectionType,
      startTime: 0,
      endTime: 12,
      measures: generateMeasures(1, 4, 0, 12),
    },
    {
      type: 'Verse' as SectionType,
      startTime: 12,
      endTime: 36,
      measures: generateMeasures(5, 12, 12, 36),
    },
    {
      type: 'Chorus' as SectionType,
      startTime: 36,
      endTime: 60,
      measures: generateMeasures(13, 20, 36, 60),
    },
    {
      type: 'Verse' as SectionType,
      startTime: 60,
      endTime: 84,
      measures: generateMeasures(21, 28, 60, 84),
    },
    {
      type: 'Chorus' as SectionType,
      startTime: 84,
      endTime: 108,
      measures: generateMeasures(29, 36, 84, 108),
    },
    {
      type: 'Bridge' as SectionType,
      startTime: 108,
      endTime: 120,
      measures: generateMeasures(37, 40, 108, 120),
    },
    {
      type: 'Chorus' as SectionType,
      startTime: 120,
      endTime: 144,
      measures: generateMeasures(41, 48, 120, 144),
    },
    {
      type: 'Outro' as SectionType,
      startTime: 144,
      endTime: 156,
      measures: generateMeasures(49, 52, 144, 156),
    }
  ];

  return {
    key,
    tempo: 120,
    structures
  };
}

// 根据小节数生成小节对象
function generateMeasures(
  startNumber: number, 
  endNumber: number, 
  startTime: number, 
  endTime: number
): Measure[] {
  const measures: Measure[] = [];
  const totalMeasures = endNumber - startNumber + 1;
  const durationPerMeasure = (endTime - startTime) / totalMeasures;
  
  const chordOptions = ['G', 'C', 'D', 'Em', 'Am', 'Bm'];
  
  for (let i = 0; i < totalMeasures; i++) {
    const number = startNumber + i;
    const measure: Measure = {
      number,
      chord: chordOptions[i % chordOptions.length],
      startTime: startTime + (i * durationPerMeasure),
      endTime: startTime + ((i + 1) * durationPerMeasure)
    };
    measures.push(measure);
  }
  
  return measures;
} 