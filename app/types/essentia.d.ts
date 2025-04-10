// Essentia.js 类型声明
declare module 'essentia.js' {
  export class Essentia {
    constructor(wasmModule: any);
    
    // 常用分析方法
    Spectrum(
      frame: Float32Array,
      windowType?: string,
      size?: number
    ): { spectrum: Float32Array };
    
    SpectralPeaks(
      spectrum: Float32Array,
      magnitudeThreshold?: number,
      maxPeaks?: number,
      minFrequency?: number,
      maxFrequency?: number
    ): { peaks: Float32Array; frequencies: Float32Array };
    
    HPCP(
      peaks: Float32Array,
      frequencies: Float32Array,
      bandPreset?: boolean,
      size?: number,
      referenceFrequency?: number,
      harmonics?: number,
      nonLinear?: boolean,
      normalized?: boolean,
      weightType?: string,
      windowSize?: number
    ): { hpcp: Float32Array };
    
    Key(
      hpcp: Float32Array,
      profileType?: string,
      usePolyphony?: boolean,
      useThreeChords?: boolean
    ): { key: string; scale: string; strength: number };
    
    RhythmExtractor2013(
      signal: Float32Array,
      maxTempo?: number,
      minTempo?: number,
      method?: string
    ): { bpm: number; ticks: Float32Array; confidence: number };
    
    BeatTrackerDegara(
      signal: Float32Array
    ): { ticks: Float32Array };
    
    MFCC(
      spectrum: { spectrum: Float32Array },
      dctType?: number,
      highFrequencyBound?: number,
      inputSize?: number,
      liftering?: number,
      logType?: string,
      lowFrequencyBound?: number,
      normalize?: string,
      numberBands?: number,
      numberCoefficients?: number,
      sampleRate?: number,
      type?: string,
      warpingFormula?: string,
      weighting?: string
    ): { mfcc: Float32Array };
    
    Resample(
      signal: Float32Array,
      inputSampleRate: number,
      outputSampleRate: number
    ): { data: Float32Array };
    // 其他方法可按需添加
  }
  
  // 导出EssentiaModule实例
  export const EssentiaModule: any;
}

declare module 'essentia.js/dist/essentia-wasm.web' {
  export function EssentiaWASM(): Promise<any>;
}

// 扩展Window接口，添加webkitAudioContext
interface Window {
  AudioContext: typeof AudioContext;
  webkitAudioContext: typeof AudioContext;
} 