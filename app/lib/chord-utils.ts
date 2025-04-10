// 主要和弦与级数的映射关系
const MAJOR_CHORD_DEGREES: Record<string, Record<string, string>> = {
  // 大调
  'C': { 
    'C': 'I', 'Dm': 'ii', 'Em': 'iii', 'F': 'IV', 'G': 'V', 'Am': 'vi', 'Bdim': 'vii°', 
    'D': 'II', 'E': 'III', 'A': 'VI', 'B': 'VII', 'Fm': 'iv', 'Gm': 'v',
    'C7': 'I7', 'Dm7': 'ii7', 'Em7': 'iii7', 'F7': 'IV7', 'G7': 'V7', 'Am7': 'vi7'
  },
  'G': { 
    'G': 'I', 'Am': 'ii', 'Bm': 'iii', 'C': 'IV', 'D': 'V', 'Em': 'vi', 'F#dim': 'vii°',
    'A': 'II', 'B': 'III', 'E': 'VI', 'F#': 'VII', 'Cm': 'iv', 'Dm': 'v',
    'G7': 'I7', 'Am7': 'ii7', 'Bm7': 'iii7', 'C7': 'IV7', 'D7': 'V7', 'Em7': 'vi7'
  },
  'D': { 
    'D': 'I', 'Em': 'ii', 'F#m': 'iii', 'G': 'IV', 'A': 'V', 'Bm': 'vi', 'C#dim': 'vii°',
    'E': 'II', 'F#': 'III', 'B': 'VI', 'C#': 'VII', 'Gm': 'iv', 'Am': 'v',
    'D7': 'I7', 'Em7': 'ii7', 'F#m7': 'iii7', 'G7': 'IV7', 'A7': 'V7', 'Bm7': 'vi7'
  },
  'A': { 
    'A': 'I', 'Bm': 'ii', 'C#m': 'iii', 'D': 'IV', 'E': 'V', 'F#m': 'vi', 'G#dim': 'vii°',
    'B': 'II', 'C#': 'III', 'F#': 'VI', 'G#': 'VII', 'Dm': 'iv', 'Em': 'v',
    'A7': 'I7', 'Bm7': 'ii7', 'C#m7': 'iii7', 'D7': 'IV7', 'E7': 'V7', 'F#m7': 'vi7'
  },
  'E': { 
    'E': 'I', 'F#m': 'ii', 'G#m': 'iii', 'A': 'IV', 'B': 'V', 'C#m': 'vi', 'D#dim': 'vii°',
    'F#': 'II', 'G#': 'III', 'C#': 'VI', 'D#': 'VII', 'Am': 'iv', 'Bm': 'v',
    'E7': 'I7', 'F#m7': 'ii7', 'G#m7': 'iii7', 'A7': 'IV7', 'B7': 'V7', 'C#m7': 'vi7'
  },
  'B': { 
    'B': 'I', 'C#m': 'ii', 'D#m': 'iii', 'E': 'IV', 'F#': 'V', 'G#m': 'vi', 'A#dim': 'vii°',
    'C#': 'II', 'D#': 'III', 'G#': 'VI', 'A#': 'VII', 'Em': 'iv', 'F#m': 'v',
    'B7': 'I7', 'C#m7': 'ii7', 'D#m7': 'iii7', 'E7': 'IV7', 'F#7': 'V7', 'G#m7': 'vi7'
  },
  'F': { 
    'F': 'I', 'Gm': 'ii', 'Am': 'iii', 'Bb': 'IV', 'C': 'V', 'Dm': 'vi', 'Edim': 'vii°',
    'G': 'II', 'A': 'III', 'D': 'VI', 'E': 'VII', 'Bbm': 'iv', 'Cm': 'v',
    'F7': 'I7', 'Gm7': 'ii7', 'Am7': 'iii7', 'Bb7': 'IV7', 'C7': 'V7', 'Dm7': 'vi7'
  },
  'Bb': { 
    'Bb': 'I', 'Cm': 'ii', 'Dm': 'iii', 'Eb': 'IV', 'F': 'V', 'Gm': 'vi', 'Adim': 'vii°',
    'C': 'II', 'D': 'III', 'G': 'VI', 'A': 'VII', 'Ebm': 'iv', 'Fm': 'v',
    'Bb7': 'I7', 'Cm7': 'ii7', 'Dm7': 'iii7', 'Eb7': 'IV7', 'F7': 'V7', 'Gm7': 'vi7'
  },
  'Eb': { 
    'Eb': 'I', 'Fm': 'ii', 'Gm': 'iii', 'Ab': 'IV', 'Bb': 'V', 'Cm': 'vi', 'Ddim': 'vii°',
    'F': 'II', 'G': 'III', 'C': 'VI', 'D': 'VII', 'Abm': 'iv', 'Bbm': 'v',
    'Eb7': 'I7', 'Fm7': 'ii7', 'Gm7': 'iii7', 'Ab7': 'IV7', 'Bb7': 'V7', 'Cm7': 'vi7'
  },
  // 小调 (相对应的和声小调)
  'Am': { 
    'Am': 'i', 'Bdim': 'ii°', 'C': 'III', 'Dm': 'iv', 'Em': 'v', 'F': 'VI', 'G': 'VII',
    'E': 'V', 'A': 'I', 'C#dim': 'vii°', 'G#dim': 'vii°', 'Bm': 'ii', 'D': 'IV', 
    'Am7': 'i7', 'Dm7': 'iv7', 'Em7': 'v7', 'F7': 'VI7', 'G7': 'VII7', 'E7': 'V7'
  },
  'Em': { 
    'Em': 'i', 'F#dim': 'ii°', 'G': 'III', 'Am': 'iv', 'Bm': 'v', 'C': 'VI', 'D': 'VII',
    'B': 'V', 'E': 'I', 'G#dim': 'vii°', 'D#dim': 'vii°', 'F#m': 'ii', 'A': 'IV',
    'Em7': 'i7', 'Am7': 'iv7', 'Bm7': 'v7', 'C7': 'VI7', 'D7': 'VII7', 'B7': 'V7'
  },
  'Bm': { 
    'Bm': 'i', 'C#dim': 'ii°', 'D': 'III', 'Em': 'iv', 'F#m': 'v', 'G': 'VI', 'A': 'VII',
    'F#': 'V', 'B': 'I', 'D#dim': 'vii°', 'A#dim': 'vii°', 'C#m': 'ii', 'E': 'IV',
    'Bm7': 'i7', 'Em7': 'iv7', 'F#m7': 'v7', 'G7': 'VI7', 'A7': 'VII7', 'F#7': 'V7'
  },
  'F#m': { 
    'F#m': 'i', 'G#dim': 'ii°', 'A': 'III', 'Bm': 'iv', 'C#m': 'v', 'D': 'VI', 'E': 'VII',
    'C#': 'V', 'F#': 'I', 'A#dim': 'vii°', 'E#dim': 'vii°', 'G#m': 'ii', 'B': 'IV',
    'F#m7': 'i7', 'Bm7': 'iv7', 'C#m7': 'v7', 'D7': 'VI7', 'E7': 'VII7', 'C#7': 'V7'
  },
  'C#m': { 
    'C#m': 'i', 'D#dim': 'ii°', 'E': 'III', 'F#m': 'iv', 'G#m': 'v', 'A': 'VI', 'B': 'VII',
    'G#': 'V', 'C#': 'I', 'E#dim': 'vii°', 'B#dim': 'vii°', 'D#m': 'ii', 'F#': 'IV',
    'C#m7': 'i7', 'F#m7': 'iv7', 'G#m7': 'v7', 'A7': 'VI7', 'B7': 'VII7', 'G#7': 'V7'
  },
  'Dm': { 
    'Dm': 'i', 'Edim': 'ii°', 'F': 'III', 'Gm': 'iv', 'Am': 'v', 'Bb': 'VI', 'C': 'VII',
    'A': 'V', 'D': 'I', 'F#dim': 'vii°', 'C#dim': 'vii°', 'Em': 'ii', 'G': 'IV',
    'Dm7': 'i7', 'Gm7': 'iv7', 'Am7': 'v7', 'Bb7': 'VI7', 'C7': 'VII7', 'A7': 'V7'
  },
  'Gm': { 
    'Gm': 'i', 'Adim': 'ii°', 'Bb': 'III', 'Cm': 'iv', 'Dm': 'v', 'Eb': 'VI', 'F': 'VII',
    'D': 'V', 'G': 'I', 'B°': 'vii°', 'F#°': 'vii°', 'Am': 'ii', 'C': 'IV',
    'Gm7': 'i7', 'Cm7': 'iv7', 'Dm7': 'v7', 'Eb7': 'VI7', 'F7': 'VII7', 'D7': 'V7'
  }
};

// 将阿拉伯数字表示法转为易读的级数
const NUMERIC_TO_DEGREE: Record<string, string> = {
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII',
  '1m': 'i', '2m': 'ii', '3m': 'iii', '4m': 'iv', '5m': 'v', '6m': 'vi', '7m': 'vii'
};

// 更精确地识别和弦类型并规格化
export const normalizeChord = (chord: string): string => {
  if (!chord || chord === '%') return chord;
  
  // 基本的和弦规格化
  // 去除空格，统一b和♭
  let normalized = chord.trim().replace(/\s/g, '').replace(/♭/g, 'b');
  
  // 处理增减和弦简写
  normalized = normalized
    .replace(/dim/g, '°')
    .replace(/aug/g, '+');
  
  return normalized;
};

/**
 * 将API返回的调性格式转换为标准格式
 * 例如："E major" -> "E", "E minor" -> "Em"
 * @param key API返回的调性
 * @returns 标准化后的调性
 */
export const normalizeKey = (key: string): string => {
  if (!key) return 'C'; // 默认返回C调

  // 移除多余空格
  const trimmedKey = key.trim();
  
  // 处理常见的格式
  if (/ major$/i.test(trimmedKey)) {
    // 大调：移除" major"后缀
    return trimmedKey.replace(/ major$/i, '');
  } else if (/ minor$/i.test(trimmedKey)) {
    // 小调：将" minor"替换为"m"
    return trimmedKey.replace(/ minor$/i, 'm');
  } else if (/ maj$/i.test(trimmedKey)) {
    // 处理maj缩写
    return trimmedKey.replace(/ maj$/i, '');
  } else if (/ min$/i.test(trimmedKey)) {
    // 处理min缩写
    return trimmedKey.replace(/ min$/i, 'm');
  }
  
  // 已经是标准格式或无法识别
  return trimmedKey;
};

/**
 * 将和弦名称转换为对应调性下的级数表示法
 * @param chord 和弦名称
 * @param key 调性
 * @returns 级数表示
 */
export const chordToDegree = (chord: string, key: string): string => {
  // 处理"%"符号（重复上一个和弦）
  if (chord === '%') return '%';
  
  // 规格化和弦名称
  const normalizedChord = normalizeChord(chord);
  
  // 规格化调性
  const normalizedKey = normalizeKey(key);
  
  // 查找当前调性的映射表
  const degreesMap = MAJOR_CHORD_DEGREES[normalizedKey] || MAJOR_CHORD_DEGREES['C'];
  
  // 返回对应的级数，如果没有映射关系，则返回原和弦名称
  return degreesMap[normalizedChord] || normalizedChord;
};

/**
 * 将级数表示法转换为阿拉伯数字表示法
 * @param degree 级数表示法
 * @returns 阿拉伯数字表示
 */
export const degreeToNumeric = (degree: string): string => {
  if (degree === '%') return '%';
  
  // 处理小调和变化和弦
  if (degree.includes('i') || degree.includes('°')) {
    if (degree === 'ii°' || degree === 'vii°') return degree;
    if (degree === 'i') return '1m';
    if (degree === 'ii') return '2m';
    if (degree === 'iii') return '3m';
    if (degree === 'iv') return '4m';
    if (degree === 'v') return '5m';
    if (degree === 'vi') return '6m';
    if (degree === 'vii') return '7m';
  }
  
  // 处理大调和弦
  if (degree === 'I') return '1';
  if (degree === 'II') return '2';
  if (degree === 'III') return '3';
  if (degree === 'IV') return '4';
  if (degree === 'V') return '5';
  if (degree === 'VI') return '6';
  if (degree === 'VII') return '7';
  
  // 处理七和弦
  if (degree.endsWith('7')) {
    const base = degree.slice(0, -1);
    const numeric = degreeToNumeric(base);
    return numeric + '7';
  }
  
  return degree;
};

/**
 * 将和弦名称转换为阿拉伯数字表示法
 * @param chord 和弦名称
 * @param key 调性
 * @returns 阿拉伯数字表示
 */
export const chordToNumeric = (chord: string, key: string): string => {
  if (!chord) return '-';
  const degree = chordToDegree(chord, key);
  return degreeToNumeric(degree);
}; 