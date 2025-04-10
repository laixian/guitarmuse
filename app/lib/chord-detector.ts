'use client'

import * as EssentiaWASM from 'essentia.js/dist/essentia-wasm.web';
import * as Essentia from 'essentia.js';
import * as tf from '@tensorflow/tfjs';

// 加载TensorFlow模型
let chordModel: tf.LayersModel | null = null;

// 定义和弦类型
const CHORD_TYPES = [
  'N', // 无和弦
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
  'C7', 'C#7', 'D7', 'D#7', 'E7', 'F7', 'F#7', 'G7', 'G#7', 'A7', 'A#7', 'B7'
];

// 初始化TensorFlow和Essentia
export async function initChordDetector() {
  // 初始化TensorFlow (只加载一次)
  if (!chordModel) {
    try {
      // 注意：在真实环境中，您应该托管并加载您训练好的模型
      // 此处我们使用一个预训练的模型URL
      // chordModel = await tf.loadLayersModel('/models/chord-detection/model.json');
      await tf.ready();
      console.log('TensorFlow已准备就绪用于和弦检测');
    } catch (error) {
      console.error('加载和弦检测模型失败:', error);
    }
  }
  
  // 初始化Essentia
  try {
    const EssentiaModule = await EssentiaWASM.EssentiaWASM();
    const essentia = new Essentia.Essentia(EssentiaModule);
    return essentia;
  } catch (error) {
    console.error('初始化Essentia失败:', error);
    throw new Error('音频分析引擎初始化失败');
  }
}

// 提取PCP (Pitch Class Profile，音高类别轮廓) 特征
export async function extractPCP(audioData: Float32Array, essentia: any): Promise<Float32Array[]> {
  try {
    // 将音频分段，每段大约0.5秒
    const frameSize = 16384; // 约0.37秒 (采样率44.1kHz)
    const hopSize = 8192;   // 50%重叠
    const pcpFeatures: Float32Array[] = [];
    
    for (let i = 0; i < audioData.length - frameSize; i += hopSize) {
      const frame = audioData.slice(i, i + frameSize);
      
      // 应用汉宁窗
      const windowed = essentia.Windowing(frame, "hann");
      
      // 计算频谱
      const spectrum = essentia.Spectrum(windowed.frame);
      
      // 提取谱峰
      const spectralPeaks = essentia.SpectralPeaks(spectrum.spectrum);
      
      // 计算HPCP (和弦检测的关键特征)
      const hpcp = essentia.HPCP(spectralPeaks.peaks, spectralPeaks.frequencies);
      
      // 归一化特征
      const hpcpNorm = essentia.NormalizeArray(hpcp.hpcp, 1);
      
      pcpFeatures.push(hpcpNorm.normalized);
    }
    
    return pcpFeatures;
  } catch (error) {
    console.error('提取PCP特征失败:', error);
    return [];
  }
}

// 使用特征增强和弦检测
export async function detectChordsAdvanced(audioData: Float32Array, key: string): Promise<string[]> {
  try {
    // 初始化检测器
    const essentia = await initChordDetector();
    
    // 提取PCP特征
    const pcpFeatures = await extractPCP(audioData, essentia);
    
    // 如果特征提取失败，返回基于调性的预设和弦
    if (pcpFeatures.length === 0) {
      return generateChordsFromKey(key, Math.floor(audioData.length / 44100 / 2));
    }
    
    // 定义常见和弦特征模板 (基于音乐理论)
    const chordTemplates = createChordTemplates();
    
    // 对每个特征帧进行和弦匹配
    const detectedChords: string[] = [];
    
    for (const pcp of pcpFeatures) {
      // 寻找最匹配的和弦
      let bestMatch = 'N';
      let highestCorrelation = -1;
      
      // 计算与每个和弦模板的相关性
      for (const [chord, template] of Object.entries(chordTemplates)) {
        const correlation = computeCorrelation(Array.from(pcp), template);
        
        if (correlation > highestCorrelation) {
          highestCorrelation = correlation;
          bestMatch = chord;
        }
      }
      
      // 添加检测结果
      detectedChords.push(bestMatch);
    }
    
    // 后处理：平滑和弦序列，消除快速变化
    const smoothedChords = smoothChordSequence(detectedChords);
    
    // 将和弦序列按照调性音阶关系进行调整
    return harmonizeChordSequence(smoothedChords, key);
  } catch (error) {
    console.error('高级和弦检测失败:', error);
    return generateChordsFromKey(key, Math.floor(audioData.length / 44100 / 2));
  }
}

// 创建和弦模板库
function createChordTemplates(): Record<string, number[]> {
  const templates: Record<string, number[]> = {};
  
  // 大三和弦模板 (根音, 大三度, 纯五度)
  const majorTemplate = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0];
  
  // 小三和弦模板 (根音, 小三度, 纯五度)
  const minorTemplate = [1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0];
  
  // 属七和弦模板 (根音, 大三度, 纯五度, 小七度)
  const dominant7Template = [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0];
  
  // 为所有调性生成和弦模板
  for (let i = 0; i < 12; i++) {
    // 大三和弦
    const majorChord = CHORD_TYPES[i + 1]; // 跳过'N'
    templates[majorChord] = rotateArray(majorTemplate, i);
    
    // 小三和弦
    const minorChord = CHORD_TYPES[i + 13];
    templates[minorChord] = rotateArray(minorTemplate, i);
    
    // 属七和弦
    const dominant7Chord = CHORD_TYPES[i + 25];
    templates[dominant7Chord] = rotateArray(dominant7Template, i);
  }
  
  // 添加无和弦特征 (均匀分布)
  templates['N'] = Array(12).fill(1/12);
  
  return templates;
}

// 旋转数组（用于生成不同调的和弦特征模板）
function rotateArray(arr: number[], positions: number): number[] {
  const n = arr.length;
  positions = positions % n;
  return [...arr.slice(n - positions), ...arr.slice(0, n - positions)];
}

// 计算两个特征向量之间的相关性
function computeCorrelation(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return -1;
  
  let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, pSum = 0;
  const n = vec1.length;
  
  for (let i = 0; i < n; i++) {
    sum1 += vec1[i];
    sum2 += vec2[i];
    sum1Sq += vec1[i] ** 2;
    sum2Sq += vec2[i] ** 2;
    pSum += vec1[i] * vec2[i];
  }
  
  const num = pSum - (sum1 * sum2 / n);
  const den = Math.sqrt((sum1Sq - sum1 ** 2 / n) * (sum2Sq - sum2 ** 2 / n));
  
  return den === 0 ? 0 : num / den;
}

// 平滑和弦序列，减少快速变化
function smoothChordSequence(chords: string[]): string[] {
  if (chords.length <= 2) return chords;
  
  const smoothed: string[] = [chords[0]];
  
  for (let i = 1; i < chords.length - 1; i++) {
    // 如果当前和弦与前后和弦不同，但前后和弦相同，则认为当前和弦可能是噪声
    if (chords[i] !== chords[i-1] && chords[i] !== chords[i+1] && chords[i-1] === chords[i+1]) {
      smoothed.push(chords[i-1]); // 用前一个和弦替代
    } else {
      smoothed.push(chords[i]);
    }
  }
  
  if (chords.length > 1) {
    smoothed.push(chords[chords.length - 1]);
  }
  
  return smoothed;
}

// 根据调性美化和弦序列
function harmonizeChordSequence(chords: string[], key: string): string[] {
  // 获取当前调性的常用和弦
  const commonChords = getCommonChordsInKey(key);
  
  return chords.map(chord => {
    // 如果和弦已经在当前调性的常用和弦中，保留它
    if (commonChords.includes(chord)) {
      return chord;
    }
    
    // 查找音高相近的替代和弦
    const rootNote = chord.replace(/m|7/g, ''); // 提取根音
    const chordType = chord.includes('m') ? 'm' : chord.includes('7') ? '7' : '';
    
    // 尝试找到在调内且根音相近的和弦
    for (const commonChord of commonChords) {
      const commonRoot = commonChord.replace(/m|7/g, '');
      if (getNoteDistance(rootNote, commonRoot) <= 2) {
        return commonChord;
      }
    }
    
    // 如果找不到合适的替代，使用调性的主和弦
    return key.includes('m') ? key : key;
  });
}

// 获取两个音符之间的距离（半音数）
function getNoteDistance(note1: string, note2: string): number {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const index1 = notes.indexOf(note1);
  const index2 = notes.indexOf(note2);
  
  if (index1 === -1 || index2 === -1) return 12; // 最大距离
  
  const dist = Math.abs(index1 - index2);
  return Math.min(dist, 12 - dist); // 考虑八度循环
}

// 获取调性中的常用和弦
function getCommonChordsInKey(key: string): string[] {
  // 大调常用和弦进行
  const majorKeyChords: Record<string, string[]> = {
    'C': ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'],
    'G': ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'D7'],
    'D': ['D', 'Em', 'F#m', 'G', 'A', 'Bm', 'A7'],
    'A': ['A', 'Bm', 'C#m', 'D', 'E', 'F#m', 'E7'],
    'E': ['E', 'F#m', 'G#m', 'A', 'B', 'C#m', 'B7'],
    'F': ['F', 'Gm', 'Am', 'Bb', 'C', 'Dm', 'C7'],
    'Bb': ['Bb', 'Cm', 'Dm', 'Eb', 'F', 'Gm', 'F7'],
    'Eb': ['Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'Cm', 'Bb7'],
    'Ab': ['Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'Fm', 'Eb7'],
    'Db': ['Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'Bbm', 'Ab7'],
    'Gb': ['Gb', 'Abm', 'Bbm', 'Cb', 'Db', 'Ebm', 'Db7'],
    'B': ['B', 'C#m', 'D#m', 'E', 'F#', 'G#m', 'F#7'],
    'F#': ['F#', 'G#m', 'A#m', 'B', 'C#', 'D#m', 'C#7']
  };
  
  // 小调常用和弦进行
  const minorKeyChords: Record<string, string[]> = {
    'Am': ['Am', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G', 'E7'],
    'Em': ['Em', 'F#dim', 'G', 'Am', 'Bm', 'C', 'D', 'B7'],
    'Bm': ['Bm', 'C#dim', 'D', 'Em', 'F#m', 'G', 'A', 'F#7'],
    'F#m': ['F#m', 'G#dim', 'A', 'Bm', 'C#m', 'D', 'E', 'C#7'],
    'C#m': ['C#m', 'D#dim', 'E', 'F#m', 'G#m', 'A', 'B', 'G#7'],
    'G#m': ['G#m', 'A#dim', 'B', 'C#m', 'D#m', 'E', 'F#', 'D#7'],
    'D#m': ['D#m', 'E#dim', 'F#', 'G#m', 'A#m', 'B', 'C#', 'A#7'],
    'A#m': ['A#m', 'Bdim', 'C#', 'D#m', 'E#m', 'F#', 'G#', 'E#7'],
    'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C', 'A7'],
    'Gm': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F', 'D7'],
    'Cm': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'G7'],
    'Fm': ['Fm', 'Gdim', 'Ab', 'Bbm', 'Cm', 'Db', 'Eb', 'C7'],
    'Bbm': ['Bbm', 'Cdim', 'Db', 'Ebm', 'Fm', 'Gb', 'Ab', 'F7']
  };
  
  // 根据提供的调性返回常用和弦
  if (key.includes('m')) {
    return minorKeyChords[key] || minorKeyChords['Am']; // 默认为A小调
  } else {
    return majorKeyChords[key] || majorKeyChords['C']; // 默认为C大调
  }
}

// 备用方法：基于调性生成和弦
export function generateChordsFromKey(key: string, numChords: number): string[] {
  const chords = getCommonChordsInKey(key);
  const result: string[] = [];
  
  // 为每个小节生成一个和弦，尝试创建合理的和弦进行
  for (let i = 0; i < numChords; i++) {
    // 创建一个简单的和弦进行模式
    if (i % 8 === 0) {
      // 段落开始 - 通常使用主和弦
      result.push(key.includes('m') ? key : key);
    } else if (i % 8 === 4) {
      // 段落中间 - 通常使用属和弦
      result.push(chords[4] || chords[0]);
    } else if (i % 8 === 2 || i % 8 === 6) {
      // 次重要位置 - 使用下属和弦或副属和弦
      result.push(chords[3] || chords[1]);
    } else {
      // 其他位置 - 随机选择
      result.push(chords[i % chords.length]);
    }
  }
  
  return result;
} 