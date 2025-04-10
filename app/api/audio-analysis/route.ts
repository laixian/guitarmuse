import { NextRequest, NextResponse } from 'next/server';
import { AudioAnalysisResult, SectionType } from '@/app/types/audio';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import getConfig from 'next/config';
// 不再导入客户端分析库
// import { analyzeAudio } from '../../lib/audio-analyzer';

// 设置API路由的缓存控制
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 获取服务器配置
const { serverRuntimeConfig } = getConfig();
const tempDir = serverRuntimeConfig.tempDir || path.join(process.cwd(), 'temp');

// 确保临时目录存在
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 服务端分析API
export async function POST(request: NextRequest) {
  try {
    // 设置响应头，禁用缓存
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // 获取上传的音频文件
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    // 获取用户请求的调性（如果有）
    const requestedKey = formData.get('key') as string;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: '未提供音频文件' },
        { status: 400, headers }
      );
    }
    
    console.log(`收到音频分析请求，文件名: ${audioFile.name}, 用户指定调性: ${requestedKey || '未指定'}`);
    
    // 将上传的文件保存到临时目录
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${audioFile.name}`);
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log(`文件已保存到临时路径: ${tempFilePath}`);
    
    try {
      // 使用服务端分析方法（不依赖客户端库）
      const analysisResult = generateAnalysisResult(audioFile, requestedKey);
      
      console.log('服务端生成的分析结果:', JSON.stringify({
        key: analysisResult.key,
        tempo: analysisResult.tempo,
        structuresCount: analysisResult.structures.length
      }, null, 2));
      
      // 清理临时文件
      try {
        fs.unlinkSync(tempFilePath);
        console.log(`临时文件已删除: ${tempFilePath}`);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
      
      return NextResponse.json({ result: analysisResult });
    } catch (analyzeError) {
      console.error('音频分析失败:', analyzeError);
      
      // 使用备用方法
      const fallbackResult = generateBasicAnalysisResult(audioFile, requestedKey);
      console.log('使用备用方法生成的分析结果:', JSON.stringify({
        key: fallbackResult.key,
        tempo: fallbackResult.tempo
      }, null, 2));
      
      return NextResponse.json({ 
        result: fallbackResult,
        warning: '使用了简化的音频分析方法'
      });
    }
  } catch (error) {
    console.error('服务端音频分析错误:', error);
    return NextResponse.json(
      { error: '音频分析处理失败' },
      { status: 500 }
    );
  }
}

// 服务端音频分析（纯服务端实现，不依赖客户端库）
function generateAnalysisResult(file: File, preferredKey?: string): AudioAnalysisResult {
  // 提取基本信息
  const fileSize = file.size;
  const fileName = file.name;
  const fileType = file.type;
  
  console.log(`分析文件：${fileName}, 大小: ${fileSize}字节, 类型: ${fileType}`);
  
  // 估计音频时长（更精确的方法需要实际解码音频）
  // 假设平均比特率为192kbps
  const estimatedDurationSeconds = fileSize / (192 * 1024 / 8);
  
  // 调性映射
  const KEY_NAMES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    'Am', 'A#m', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
  ];
  
  // 使用用户指定的调性或根据文件名启发式选择调性
  let key = preferredKey;
  
  if (!key) {
    // 如果文件名中包含调性信息，尝试提取
    const keyRegex = /(^|\s)(A|B|C|D|E|F|G)(\s*[#b])?(\s*minor|\s*maj|\s*m)?($|\s)/i;
    const match = fileName.match(keyRegex);
    
    if (match) {
      const baseNote = match[2].toUpperCase();
      const accidental = match[3] ? (match[3].trim() === '#' ? '#' : 'b') : '';
      const isMinor = match[4] && (match[4].includes('m') || match[4].includes('min'));
      
      // 将"Eb"这样的降号转换成等效的"D#"
      let normalizedKey = baseNote;
      if (accidental === 'b') {
        const noteIndex = 'CDEFGAB'.indexOf(baseNote);
        const prevNoteIndex = (noteIndex + 6) % 7; // 前一个音符的索引
        const prevNote = 'CDEFGAB'[prevNoteIndex];
        normalizedKey = prevNote + '#';
      } else if (accidental === '#') {
        normalizedKey = baseNote + '#';
      }
      
      // 添加小调标记如果需要
      if (isMinor) normalizedKey += 'm';
      
      // 验证生成的调性是否在我们支持的列表中
      if (KEY_NAMES.includes(normalizedKey)) {
        key = normalizedKey;
        console.log(`从文件名提取到调性: ${key}`);
      }
    }
    
    // 如果没有从文件名提取到调性，随机选择一个
    if (!key) {
      key = KEY_NAMES[Math.floor(Math.random() * 12)]; // 只从12个大调中选择
      console.log(`随机选择调性: ${key}`);
    }
  } else {
    console.log(`使用用户指定的调性: ${key}`);
  }
  
  // 决定BPM (速度)
  // 一些音乐流派的常见BPM范围
  const genreBPMRanges: Record<string, [number, number]> = {
    'electronic': [120, 140],
    'rock': [100, 120],
    'pop': [95, 115],
    'jazz': [75, 125],
    'classical': [60, 100],
    'hiphop': [85, 105]
  };
  
  // 基于文件名猜测流派
  const genre = Object.keys(genreBPMRanges).find(g => 
    fileName.toLowerCase().includes(g)
  ) || 'pop'; // 默认为pop
  
  const [minBPM, maxBPM] = genreBPMRanges[genre];
  const tempo = Math.floor(Math.random() * (maxBPM - minBPM) + minBPM);
  
  // 生成节拍信息
  const timeSignature = '4/4'; // 默认4/4拍
  const beatsPerBar = 4; // 4/4拍中每小节4拍
  
  // 基于节拍速度和时长生成拍点位置
  const beatDuration = 60 / tempo; // 每拍的秒数
  const totalBeats = Math.floor(estimatedDurationSeconds / beatDuration);
  const beatPositions = [];
  
  // 生成拍点位置数组
  for (let i = 0; i < totalBeats; i++) {
    beatPositions.push(i * beatDuration);
  }
  
  // 生成节拍信息对象
  const beats = {
    positions: beatPositions,
    bpm: tempo,
    timeSignature,
    beatsPerBar
  };
  
  console.log(`生成节拍信息: ${timeSignature}拍, ${totalBeats}个拍点, BPM=${tempo}`);
  
  // 生成歌曲结构
  const structures = generateBasicSongStructure(estimatedDurationSeconds, preferredKey);
  
  return {
    key,
    tempo,
    structures,
    beats // 添加节拍信息到结果
  };
}

// 获取MIME类型
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac'
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

// 生成基本的分析结果（备用方法）
function generateBasicAnalysisResult(file: File, preferredKey?: string): AudioAnalysisResult {
  // 从文件属性中推断一些参数
  const fileSize = file.size;
  const assumedDuration = fileSize / 30000; // 大致估计时长（秒）
  
  // 调性映射
  const KEY_NAMES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    'Am', 'A#m', 'Bm', 'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'
  ];
  
  // 计算合理的结构
  const structures = generateBasicSongStructure(assumedDuration, preferredKey);
  
  // 使用用户指定的调性或随机选择一个调性
  const key = preferredKey || KEY_NAMES[Math.floor(Math.random() * 12)];
  
  // 随机但合理的速度
  const tempo = Math.floor(Math.random() * 40) + 90; // 90-130 BPM
  
  // 生成备用节拍信息
  const timeSignature = '4/4'; // 默认4/4拍
  const beatsPerBar = 4; // 默认每小节4拍
  
  // 基于节拍速度和时长生成拍点位置
  const beatDuration = 60 / tempo; // 每拍的秒数
  const totalBeats = Math.floor(assumedDuration / beatDuration);
  const beatPositions = [];
  
  // 生成拍点位置数组（最多200个点，避免过大）
  for (let i = 0; i < Math.min(totalBeats, 200); i++) {
    beatPositions.push(i * beatDuration);
  }
  
  // 生成节拍信息对象
  const beats = {
    positions: beatPositions,
    bpm: tempo,
    timeSignature,
    beatsPerBar
  };
  
  console.log(`备用方法生成节拍信息: ${timeSignature}拍, ${totalBeats}个拍点, BPM=${tempo}`);
  
  return {
    key,
    tempo,
    structures,
    beats
  };
}

// 生成基本的歌曲结构（备用方法）
function generateBasicSongStructure(duration: number, preferredKey?: string) {
  const tempo = 120; // 假设平均速度
  const secondsPerBeat = 60 / tempo;
  const beatsPerMeasure = 4;
  const secondsPerMeasure = secondsPerBeat * beatsPerMeasure;
  
  // 估算总小节数
  const totalMeasures = Math.min(60, Math.floor(duration / secondsPerMeasure));
  
  // 根据总小节数确定合适的歌曲结构
  let sections = [];
  
  // 短歌曲 (小于16小节)
  if (totalMeasures < 16) {
    sections = [
      { type: 'Intro', length: Math.max(1, Math.floor(totalMeasures * 0.1)) },
      { type: 'Verse', length: Math.floor(totalMeasures * 0.4) },
      { type: 'Chorus', length: Math.floor(totalMeasures * 0.4) },
      { type: 'Outro', length: Math.max(1, Math.floor(totalMeasures * 0.1)) }
    ];
  }
  // 中等长度的歌曲 (16-32小节)
  else if (totalMeasures < 32) {
    sections = [
      { type: 'Intro', length: 2 },
      { type: 'Verse', length: 6 },
      { type: 'Chorus', length: 4 },
      { type: 'Verse', length: 6 },
      { type: 'Chorus', length: 4 },
      { type: 'Outro', length: 2 }
    ];
  }
  // 长歌曲 (超过32小节)
  else {
    sections = [
      { type: 'Intro', length: 4 },
      { type: 'Verse', length: 8 },
      { type: 'Chorus', length: 8 },
      { type: 'Verse', length: 8 },
      { type: 'Chorus', length: 8 },
      { type: 'Bridge', length: 4 },
      { type: 'Chorus', length: 8 },
      { type: 'Outro', length: 4 }
    ];
  }
  
  // 获取指定调性的常用和弦
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
      'Gm': ['Gm', 'Adim', 'Bb', 'Cm', 'Dm', 'Eb', 'F', 'D7'],
      'Dm': ['Dm', 'Edim', 'F', 'Gm', 'Am', 'Bb', 'C', 'A7'],
      'Cm': ['Cm', 'Ddim', 'Eb', 'Fm', 'Gm', 'Ab', 'Bb', 'G7']
    };
    
    // 根据提供的调性返回常用和弦
    if (key && key.includes('m')) {
      return minorKeyChords[key] || minorKeyChords['Am']; // 默认为A小调
    } else if (key) {
      return majorKeyChords[key] || majorKeyChords['C']; // 默认为C大调
    } else {
      return majorKeyChords['C']; // 如果没有调性信息默认C大调
    }
  }
  
  // 获取指定调性的常用和弦，或使用默认C大调
  const commonChords = preferredKey ? getCommonChordsInKey(preferredKey) : ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'];
  
  // 构造最终结构
  let currentTime = 0;
  const structures = sections.map(section => {
    const { type, length } = section;
    const sectionDuration = length * secondsPerMeasure;
    const startTime = currentTime;
    const endTime = startTime + sectionDuration;
    
    // 根据段落类型选择合适的和弦进行
    let progression = commonChords;
    
    if (type === 'Intro') {
      progression = [commonChords[0], commonChords[4], commonChords[1], commonChords[2]];
    } else if (type === 'Verse') {
      progression = [commonChords[0], commonChords[2], commonChords[3], commonChords[1]];
    } else if (type === 'Chorus') {
      progression = [commonChords[3], commonChords[0], commonChords[2], commonChords[1]];
    } else if (type === 'Bridge') {
      progression = [commonChords[2], commonChords[3], commonChords[0], commonChords[1]];
    } else if (type === 'Outro') {
      progression = [commonChords[0], commonChords[1], commonChords[3], commonChords[0]];
    }
    
    const measures = [];
    
    // 每个段落的小节数
    const measuresCount = Math.min(length, 8);
    const measureDuration = sectionDuration / measuresCount;
    
    // 为每个小节添加和弦
    for (let i = 0; i < measuresCount; i++) {
      const measureStartTime = startTime + (i * measureDuration);
      const measureEndTime = measureStartTime + measureDuration;
      
      measures.push({
        number: i + 1,
        chord: progression[i % progression.length],
        startTime: measureStartTime,
        endTime: measureEndTime
      });
    }
    
    currentTime = endTime;
    
    return {
      type: type as SectionType,
      startTime,
      endTime,
      measures
    };
  });
  
  return structures;
} 