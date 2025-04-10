// 为没有类型定义的库提供声明
declare module 'essentia.js' {
  export class EssentiaWASM {
    constructor();
    arrayToVector(array: Float32Array): any;
    KeyExtractor(vector: any, sampleRate: number): {
      key: string;
      scale: string;
      strength: number;
    };
  }
}

declare module 'music-tempo' {
  export class MusicTempo {
    constructor(audioData: Float32Array);
    tempo: number;
    beats: number[];
  }
} 