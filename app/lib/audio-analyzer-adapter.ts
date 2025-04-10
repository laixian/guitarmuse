'use client'

import { AudioAnalysisResult } from '../types/audio';

// 从环境变量获取 Python API URL，如果未设置则使用默认值
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000/api';

// 内存缓存 - 页面刷新或服务重启时会自动消失
// 缓存结构: {缓存键: {timestamp: 时间戳, result: 分析结果}}
const memoryCache: Record<string, {timestamp: number, result: AudioAnalysisResult}> = {};

// 缓存过期时间（24小时），单位为毫秒
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;

// 生成缓存键 - 使用文件名+大小+修改时间来确保唯一性
const generateCacheKey = (file: File): string => {
  return `audio_analysis_${file.name}_${file.size}_${file.lastModified}`;
};

// 保存分析结果到内存缓存
const saveAnalysisToCache = (file: File, result: AudioAnalysisResult): void => {
  try {
    const cacheKey = generateCacheKey(file);
    memoryCache[cacheKey] = {
      timestamp: Date.now(),
      result: result
    };
    console.log(`分析结果已缓存在内存中: ${file.name}`);
  } catch (error) {
    console.warn('无法缓存分析结果:', error);
    // 缓存失败不影响主要功能，只记录日志
  }
};

// 从内存缓存获取分析结果
const getAnalysisFromCache = (file: File): AudioAnalysisResult | null => {
  try {
    const cacheKey = generateCacheKey(file);
    const cachedData = memoryCache[cacheKey];
    
    if (!cachedData) {
      console.log(`缓存中未找到: ${file.name}`);
      return null;
    }
    
    // 检查缓存是否过期
    if (Date.now() - cachedData.timestamp > CACHE_EXPIRY) {
      console.log(`缓存已过期: ${file.name}`);
      delete memoryCache[cacheKey];
      return null;
    }
    
    console.log(`从内存缓存中获取分析结果: ${file.name}`);
    return cachedData.result;
  } catch (error) {
    console.warn('读取缓存失败:', error);
    return null;
  }
};

// 更新接口直接返回AudioAnalysisResult
export async function analyzeAudioClient(
  formData: FormData,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void
): Promise<AudioAnalysisResult> {
  try {
    const file = formData.get('audio') as File;
    if (!file || !(file instanceof File)) {
      throw new Error('无效的音频文件');
    }
    
    // 首先尝试从缓存获取分析结果
    const cachedResult = getAnalysisFromCache(file);
    if (cachedResult) {
      console.log('使用内存缓存的分析结果，跳过API请求');
      return cachedResult;
    }
    
    // 调用Python API
    console.log('向Python后端发送音频分析请求:', {
      fileName: file.name,
      fileSize: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // 设置较长的超时时间（音频分析可能需要比较长的时间）
    const controller = signal ? null : new AbortController();
    const timeoutId = controller ? setTimeout(() => controller.abort(), 180000) : null; // 增加到180秒超时 (3分钟)
    
    try {
      // 添加重试逻辑
      let retries = 3;
      let response = null;
      let error = null;
      
      while (retries > 0) {
        try {
          console.log(`发送音频分析请求，剩余尝试次数: ${retries}`);
          
          // 上传进度模拟
          if (onProgress) {
            let progress = 0;
            const progressInterval = setInterval(() => {
              progress += 5;
              if (progress > 95) {
                clearInterval(progressInterval);
                progress = 95;
              }
              onProgress(progress);
            }, 300);
            
            // 清理函数
            const clearProgressInterval = () => {
              clearInterval(progressInterval);
              onProgress(100);
            };
            
            // 确保在完成后清理
            setTimeout(clearProgressInterval, 10000);
          }
          
          response = await fetch(`${PYTHON_API_URL}/audio-analysis`, {
            method: 'POST',
            body: formData,
            signal: signal || (controller ? controller.signal : undefined),
            // 确保不使用凭据，解决CORS问题
            credentials: 'omit',
            // 明确指定mode为cors
            mode: 'cors'
          });
          
          if (response.ok) {
            console.log('音频分析请求成功！');
            if (onProgress) onProgress(100);
            break; // 如果成功，跳出重试循环
          }
          
          // 获取错误信息
          let errorMessage = '服务器返回了错误的状态码';
          try {
            const errorData = await response.json();
            if (errorData && errorData.detail) {
              errorMessage = errorData.detail;
            }
          } catch (e) {
            // 忽略解析错误
          }
          
          error = new Error(`${errorMessage}: ${response.status}`);
          retries--;
          
          // 如果还有重试次数，等待一秒后重试
          if (retries > 0) {
            console.log(`请求失败: ${errorMessage}，${retries}秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (fetchError) {
          error = fetchError;
          retries--;
          
          // 如果是网络错误且还有重试次数，等待一秒后重试
          if (retries > 0) {
            console.log(`网络错误，${retries}秒后重试...`, fetchError);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (timeoutId) clearTimeout(timeoutId); // 清除超时
      
      // 如果所有重试都失败
      if (!response || !response.ok) {
        throw new Error(error ? (error instanceof Error ? error.message : String(error)) : '请求失败，所有重试均未成功');
      }
      
      // 获取响应数据
      console.log('成功获取响应，正在解析数据...');
      const data = await response.json();
      
      // 检查响应格式
      if (!data.result) {
        console.error('API返回的数据格式不正确:', data);
        throw new Error('后端返回的数据格式不正确');
      }
      
      // 记录警告（如果有）
      if (data.warning) {
        console.warn('音频分析警告:', data.warning);
      }
      
      console.log('从Python后端收到的分析结果:', data.result);
      
      // 验证并处理节拍信息
      if (data.result.beats) {
        console.log('收到节拍信息:', data.result.beats);
      } else {
        console.log('后端未返回节拍信息，将使用默认值');
        
        // 如果后端没有返回beat信息，生成一个默认的
        data.result.beats = {
          positions: [],  // 空的位置数组
          bpm: data.result.tempo || 120,  // 使用返回的速度或默认值
          timeSignature: "4/4",           // 默认4/4拍
          beatsPerBar: 4                  // 默认每小节4拍
        };
      }
      
      // 将分析结果保存到内存缓存
      saveAnalysisToCache(file, data.result);
      
      return data.result;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('请求超时，音频分析服务响应时间过长');
      }
      throw error;
    }
  } catch (error) {
    console.error('音频分析请求失败:', error);
    
    // 创建一个基本的分析结果作为备用
    const fallbackResult: AudioAnalysisResult = {
      key: 'C',
      tempo: 120,
      structures: []
    };
    
    return fallbackResult;
  }
}

// 检测音频调性（本地简单版）
export async function detectKeySimple(file: File): Promise<string> {
  try {
    // 尝试从文件名中获取调性信息
    const fileName = file.name.toLowerCase();
    
    // 检查文件名是否包含调性信息
    const keyMap: Record<string, string> = {
      'c_major': 'C', 'c_maj': 'C', 'cmaj': 'C', 'c major': 'C',
      'd_major': 'D', 'd_maj': 'D', 'dmaj': 'D', 'd major': 'D',
      'e_major': 'E', 'e_maj': 'E', 'emaj': 'E', 'e major': 'E',
      'f_major': 'F', 'f_maj': 'F', 'fmaj': 'F', 'f major': 'F',
      'g_major': 'G', 'g_maj': 'G', 'gmaj': 'G', 'g major': 'G',
      'a_major': 'A', 'a_maj': 'A', 'amaj': 'A', 'a major': 'A',
      'b_major': 'B', 'b_maj': 'B', 'bmaj': 'B', 'b major': 'B',
      
      'am': 'Am', 'a_min': 'Am', 'a_minor': 'Am', 'a minor': 'Am',
      'bm': 'Bm', 'b_min': 'Bm', 'b_minor': 'Bm', 'b minor': 'Bm',
      'cm': 'Cm', 'c_min': 'Cm', 'c_minor': 'Cm', 'c minor': 'Cm',
      'dm': 'Dm', 'd_min': 'Dm', 'd_minor': 'Dm', 'd minor': 'Dm',
      'em': 'Em', 'e_min': 'Em', 'e_minor': 'Em', 'e minor': 'Em',
    };
    
    // 遍历键值对查找匹配
    for (const [pattern, key] of Object.entries(keyMap)) {
      if (fileName.includes(pattern)) {
        console.log(`从文件名 "${fileName}" 中检测到调性: ${key}`);
        return key;
      }
    }
    
    // 默认返回E调
    console.log(`未从文件名 "${fileName}" 中检测到调性，使用默认E调`);
    return 'E';
  } catch (error) {
    console.error('调性检测失败:', error);
    return 'E'; // 默认返回E大调
  }
}

// 获取和弦在调性中的音符名称
export function getChordNoteNames(chord: string): string[] {
  const chordMap: Record<string, string[]> = {
    // 大调和弦
    'C': ['C', 'E', 'G'],
    'G': ['G', 'B', 'D'],
    'D': ['D', 'F#', 'A'],
    'A': ['A', 'C#', 'E'],
    'E': ['E', 'G#', 'B'],
    'F': ['F', 'A', 'C'],
    // 小调和弦
    'Am': ['A', 'C', 'E'],
    'Em': ['E', 'G', 'B'],
    'Dm': ['D', 'F', 'A'],
    'Bm': ['B', 'D', 'F#'],
    // 七和弦
    'C7': ['C', 'E', 'G', 'Bb'],
    'G7': ['G', 'B', 'D', 'F'],
    'D7': ['D', 'F#', 'A', 'C'],
    // 附加和弦
    'Cadd9': ['C', 'E', 'G', 'D'],
    'Gsus4': ['G', 'C', 'D'],
  };
  
  return chordMap[chord] || [];
}

// 获取调性和弦级数
export function getChordDegree(key: string, chord: string): string {
  const majorDegrees: Record<string, Record<string, string>> = {
    'C': { 'C': 'I', 'Dm': 'ii', 'Em': 'iii', 'F': 'IV', 'G': 'V', 'Am': 'vi', 'Bdim': 'vii°' },
    'G': { 'G': 'I', 'Am': 'ii', 'Bm': 'iii', 'C': 'IV', 'D': 'V', 'Em': 'vi', 'F#dim': 'vii°' },
    'D': { 'D': 'I', 'Em': 'ii', 'F#m': 'iii', 'G': 'IV', 'A': 'V', 'Bm': 'vi', 'C#dim': 'vii°' },
    'A': { 'A': 'I', 'Bm': 'ii', 'C#m': 'iii', 'D': 'IV', 'E': 'V', 'F#m': 'vi', 'G#dim': 'vii°' },
    'E': { 'E': 'I', 'F#m': 'ii', 'G#m': 'iii', 'A': 'IV', 'B': 'V', 'C#m': 'vi', 'D#dim': 'vii°' },
  };
  
  const minorDegrees: Record<string, Record<string, string>> = {
    'Am': { 'Am': 'i', 'Bdim': 'ii°', 'C': 'III', 'Dm': 'iv', 'Em': 'v', 'F': 'VI', 'G': 'VII' },
    'Em': { 'Em': 'i', 'F#dim': 'ii°', 'G': 'III', 'Am': 'iv', 'Bm': 'v', 'C': 'VI', 'D': 'VII' },
    'Bm': { 'Bm': 'i', 'C#dim': 'ii°', 'D': 'III', 'Em': 'iv', 'F#m': 'v', 'G': 'VI', 'A': 'VII' },
  };
  
  // 判断调性类型
  if (key.includes('m')) {
    return minorDegrees[key]?.[chord] || '';
  } else {
    return majorDegrees[key]?.[chord] || '';
  }
} 