// 音频分析工具库
'use client'

import * as EssentiaWASM from 'essentia.js/dist/essentia-wasm.web';
import * as Essentia from 'essentia.js';
import * as tf from '@tensorflow/tfjs';
import { AudioAnalysisResult, SectionType } from '../types/audio';
import { detectChordsAdvanced } from './chord-detector';

// 确保TensorFlow准备就绪
if (typeof window !== 'undefined') {
  tf.ready().then(() => {
    console.log('TensorFlow.js已准备就绪');
  });
}

// 缓存essentia实例
let essentiaInstance: Essentia.Essentia | null = null;

// 初始化essentia.js
export async function initEssentia() {
  if (essentiaInstance) return essentiaInstance;
  
  try {
    const EssentiaModule = await EssentiaWASM.EssentiaWASM();
    essentiaInstance = new Essentia.Essentia(EssentiaModule);
    return essentiaInstance;
  } catch (error) {
    console.error('初始化Essentia失败:', error);
    throw new Error('音频分析引擎初始化失败');
  }
}

// 从文件中获取音频数据
export async function getAudioData(file: File): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (!event.target?.result) return reject(new Error('读取音频文件失败'));
      
      try {
        const arrayBuffer = event.target.result as ArrayBuffer;
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0); // 获取第一个声道
        
        resolve(audioData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// 检测音调
export async function detectKey(audioData: Float32Array): Promise<string> {
  try {
    const essentia = await initEssentia();
    
    // 将音频重采样至22050Hz以提高处理效率
    const resampledAudio = essentia.Resample(audioData, 44100, 22050);
    
    // 计算色度图谱特征
    const spectrum = essentia.Spectrum(resampledAudio.data);
    const spectralPeaks = essentia.SpectralPeaks(spectrum.spectrum);
    const chromaFeatures = essentia.HPCP(spectralPeaks.peaks, spectralPeaks.frequencies);
    
    // 使用色度特征估算音调
    const keyResult = essentia.Key(chromaFeatures.hpcp);
    
    // 记录检测到的音调和置信度
    console.log(`检测到的音调: ${keyResult.key} ${keyResult.scale}, 置信度: ${keyResult.strength}`);
    
    return keyResult.key + (keyResult.scale === 'minor' ? 'm' : '');
  } catch (error) {
    console.error('音调检测失败:', error);
    return 'C'; // 默认返回C大调
  }
}

// 检测速度
export async function detectTempo(audioData: Float32Array): Promise<number> {
  try {
    const essentia = await initEssentia();
    
    // 计算节奏特征
    const rhythmExtractor = essentia.RhythmExtractor2013(audioData);
    return Math.round(rhythmExtractor.bpm);
  } catch (error) {
    console.error('速度检测失败:', error);
    return 120; // 默认返回120 BPM
  }
}

interface Structure {
  type: SectionType;
  startTime: number;
  endTime: number;
  measures: any[];
}

interface StructureResult {
  structures: Structure[];
  beatPositions: number[];
  beatInfo: {
    positions: number[];
    bpm: number;
    timeSignature: string;
    beatsPerBar: number;
  };
}

// 分析音频结构
export async function analyzeStructure(audioData: Float32Array, tempo: number): Promise<StructureResult> {
  try {
    const essentia = await initEssentia();
    
    // 计算音频特征
    const mfcc = essentia.MFCC(essentia.Spectrum(audioData)).mfcc;
    
    // 计算拍子位置
    const beatTrackerDegara = essentia.BeatTrackerDegara(audioData);
    const beatPositions = Array.from(beatTrackerDegara.ticks);
    
    // 将拍子聚合为更大的结构段落
    const segmentSize = 4; // 4拍一小节
    const measures = [];
    
    for (let i = 0; i < beatPositions.length; i += segmentSize) {
      if (i + segmentSize <= beatPositions.length) {
        measures.push({
          startTime: beatPositions[i],
          endTime: beatPositions[i + segmentSize - 1],
          number: Math.floor(i / segmentSize) + 1
        });
      }
    }
    
    // 识别主要段落
    const structureTypes: SectionType[] = ['Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];
    const structures: Structure[] = [];
    let currentSection = 'Intro';
    let sectionStartMeasure = 0;
    
    // 使用简单启发式方法生成结构
    for (let i = 0; i < measures.length; i++) {
      if (i === 0) {
        currentSection = 'Intro';
      } else if (i === Math.floor(measures.length * 0.15)) {
        currentSection = 'Verse';
      } else if (i === Math.floor(measures.length * 0.35)) {
        currentSection = 'Chorus';
      } else if (i === Math.floor(measures.length * 0.55)) {
        currentSection = 'Verse';
      } else if (i === Math.floor(measures.length * 0.7)) {
        currentSection = 'Bridge';
      } else if (i === Math.floor(measures.length * 0.8)) {
        currentSection = 'Chorus';
      } else if (i === Math.floor(measures.length * 0.95)) {
        currentSection = 'Outro';
      }
      
      if (i > 0 && currentSection !== structures[structures.length - 1]?.type) {
        structures.push({
          type: currentSection as SectionType,
          startTime: measures[sectionStartMeasure].startTime,
          endTime: measures[i - 1].endTime,
          measures: measures.slice(sectionStartMeasure, i)
        });
        sectionStartMeasure = i;
      }
    }
    
    // 添加最后一个段落
    if (sectionStartMeasure < measures.length) {
      structures.push({
        type: currentSection as SectionType,
        startTime: measures[sectionStartMeasure].startTime,
        endTime: measures[measures.length - 1].endTime,
        measures: measures.slice(sectionStartMeasure)
      });
    }
    
    // 构造并返回节拍信息
    const beatInfo = {
      positions: beatPositions,
      bpm: tempo,  // 使用检测到的或提供的速度
      timeSignature: "4/4", // 默认使用4/4拍
      beatsPerBar: 4  // 默认每小节4拍
    };
    
    console.log(`分析节拍结果: 共${beatPositions.length}个拍点, 速度=${tempo}BPM`);
    
    return { 
      structures, 
      beatPositions,
      beatInfo  // 添加节拍信息对象
    };
  } catch (error) {
    console.error('结构分析失败:', error);
    
    // 返回基本的默认结构
    const duration = audioData.length / 44100; // 假设采样率为44.1kHz
    const beatInterval = 60 / tempo;
    const beatCount = Math.floor(duration / beatInterval);
    
    // 生成拍子位置
    const beatPositions = Array.from(
      { length: beatCount }, 
      (_, i) => i * beatInterval
    );
    
    const structures = [
      {
        type: 'Intro' as SectionType,
        startTime: 0,
        endTime: duration * 0.1,
        measures: []
      },
      {
        type: 'Verse' as SectionType,
        startTime: duration * 0.1,
        endTime: duration * 0.35,
        measures: []
      },
      {
        type: 'Chorus' as SectionType,
        startTime: duration * 0.35,
        endTime: duration * 0.6,
        measures: []
      },
      {
        type: 'Bridge' as SectionType,
        startTime: duration * 0.6,
        endTime: duration * 0.75,
        measures: []
      },
      {
        type: 'Chorus' as SectionType,
        startTime: duration * 0.75,
        endTime: duration * 0.95,
        measures: []
      },
      {
        type: 'Outro' as SectionType,
        startTime: duration * 0.95,
        endTime: duration,
        measures: []
      }
    ];
    
    // 构造节拍信息
    const beatInfo = {
      positions: beatPositions,
      bpm: tempo,
      timeSignature: "4/4",
      beatsPerBar: 4
    };
    
    return { 
      structures, 
      beatPositions,
      beatInfo  // 添加节拍信息对象
    };
  }
}

// 预测和弦进行 - 使用高级和弦检测
export async function predictChords(audioData: Float32Array, key: string, beatPositions: number[]): Promise<string[]> {
  try {
    console.log(`开始使用高级和弦检测，调性: ${key}`);
    
    // 使用新的高级和弦检测器
    const chords = await detectChordsAdvanced(audioData, key);
    console.log(`高级和弦检测结果: ${chords.join(', ')}`);
    
    return chords;
  } catch (error) {
    console.error('高级和弦检测失败，回退到预设和弦进行:', error);
    
    // 常见和弦进行映射
    const commonProgressions: Record<string, string[]> = {
      'C': ['C', 'G', 'Am', 'F'],
      'G': ['G', 'D', 'Em', 'C'],
      'D': ['D', 'A', 'Bm', 'G'],
      'A': ['A', 'E', 'F#m', 'D'],
      'E': ['E', 'B', 'C#m', 'A'],
      'F': ['F', 'C', 'Dm', 'Bb'],
      // 常见小调和弦进行
      'Am': ['Am', 'F', 'C', 'G'],
      'Em': ['Em', 'C', 'G', 'D'],
      'Bm': ['Bm', 'G', 'D', 'A']
    };
    
    // 获取当前调性的常见和弦进行，如果不存在则使用C大调
    const progression = commonProgressions[key] || commonProgressions['C'];
    
    // 为每个小节分配和弦
    const measuresCount = Math.ceil(beatPositions.length / 4);
    const chords: string[] = [];
    
    for (let i = 0; i < measuresCount; i++) {
      chords.push(progression[i % progression.length]);
    }
    
    return chords;
  }
}

// 分析音频并生成结果
export async function analyzeAudio(file: File): Promise<AudioAnalysisResult> {
  try {
    console.log('开始音频分析...');
    
    // 提取音频数据
    const audioData = await getAudioData(file);
    console.log(`获取到音频数据: ${audioData.length} 个采样点`);
    
    // 检测关键音乐信息
    const key = await detectKey(audioData);
    const tempo = await detectTempo(audioData);
    
    console.log(`检测结果 - 调性: ${key}, 速度: ${tempo} BPM`);
    
    // 分析结构
    const { structures, beatPositions, beatInfo } = await analyzeStructure(audioData, tempo);
    
    // 预测和弦进行 - 使用高级和弦检测
    const chords = await predictChords(audioData, key, beatPositions);
    
    // 将和弦分配到各个小节中
    const structuresWithChords = structures.map(section => {
      // 获取该部分小节的起始和结束索引
      const sectionMeasures = section.measures.map((measure, index) => {
        const measureIndex = measure.number - 1;
        return {
          ...measure,
          chord: chords[measureIndex % chords.length]
        };
      });
      
      return {
        ...section,
        measures: sectionMeasures
      };
    });
    
    // 构造并返回分析结果
    return {
      key,
      tempo,
      structures: structuresWithChords,
      beats: beatInfo  // 添加节拍信息到结果
    };
  } catch (error) {
    console.error('音频分析失败:', error);
    throw error;
  }
} 