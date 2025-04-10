'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, Music, Guitar, Waves, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Logo } from './logo'

const features = [
  {
    icon: <Music className="w-6 h-6" />,
    title: '智能音频分析',
    description: '上传任何音乐文件，自动识别和弦进行和调性'
  },
  {
    icon: <Guitar className="w-6 h-6" />,
    title: '吉他功能谱',
    description: '生成清晰易读的吉他功能谱，帮助快速掌握歌曲结构'
  },
  {
    icon: <Waves className="w-6 h-6" />,
    title: '节奏分析',
    description: '自动检测歌曲节奏和速度，提供精确的节拍信息'
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: '导出功能',
    description: '支持导出高清图片，方便分享和打印'
  }
]

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

// 创建音符图标变体
const Music2 = (props: any) => <Music {...props} />;
const Music3 = (props: any) => <Music {...props} rotation={45} />;
const Music4 = (props: any) => <Music {...props} rotation={-45} />;

// 增强的波形动画组件 - 只显示在指定区域
const AudioWaveSimple = () => {
  const [mounted, setMounted] = useState(false);
  const [key, setKey] = useState(0); // 添加key状态用于强制重新渲染
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setMounted(true);
      
      // 强制重新渲染动画，解决某些浏览器缓存动画的问题
      const forceRender = () => {
        if (typeof document !== 'undefined') {
          // 通过改变key值强制React完全重新渲染组件
          setKey(prev => prev + 1);
          
          // 额外的DOM操作来刷新动画
          const waveContainer = document.querySelector('.wave-container');
          if (waveContainer) {
            const bars = waveContainer.querySelectorAll('.wave-bar');
            const notes = waveContainer.querySelectorAll('.music-note');
            
            // 重置波形动画
            bars.forEach((bar) => {
              const elem = bar as HTMLElement;
              elem.style.animation = 'none';
              // 强制重排
              void elem.offsetWidth;
              elem.style.animation = '';
              
              // 添加Safari兼容
              if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
                elem.style.webkitAnimation = 'none';
                void elem.offsetWidth;
                elem.style.webkitAnimation = '';
              }
            });
            
            // 重置音符动画
            notes.forEach((note) => {
              const elem = note as HTMLElement;
              elem.style.animation = 'none';
              // 强制重排
              void elem.offsetWidth;
              elem.style.animation = '';
              
              // 添加Safari兼容
              if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
                elem.style.webkitAnimation = 'none';
                void elem.offsetWidth;
                elem.style.webkitAnimation = '';
              }
            });
          }
        }
      };
      
      // 页面加载后等待100ms执行一次，确保DOM完全加载
      const initialTimer = setTimeout(forceRender, 100);
      
      // 每3秒重新渲染一次，确保动画持续进行
      const interval = setInterval(forceRender, 3000);
      
      // 添加页面可见性变更检测，恢复页面时重新触发动画
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          forceRender();
        }
      };
      
      // 添加窗口焦点事件监听
      const handleFocus = () => {
        forceRender();
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      
      return () => {
        clearTimeout(initialTimer);
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
      };
    }
  }, []);
  
  // 音符图标配置 - 增加更多变化性，使用白色音符
  const musicNotes = [
    { 
      icon: '♪', 
      delay: '0.2s',
      duration: '3s', 
      size: '18px',
      left: '15%',
      rotation: 5
    },
    { 
      icon: '♫', 
      delay: '1.5s', 
      duration: '3.5s',
      size: '16px',
      left: '55%',
      rotation: -8
    },
    { 
      icon: '♩', 
      delay: '0.8s', 
      duration: '4s',
      size: '14px',
      left: '80%',
      rotation: 10
    }
  ];
  
  // 生成波形条，使用正弦函数使它们看起来更自然
  const waveBarCount = 8; // 降低波形条数量以适应小区域
  const waveBars = Array.from({ length: waveBarCount }).map((_, index) => {
    // 使用正弦函数创建自然的波形高度变化
    const heightFactor = Math.sin((index / waveBarCount) * Math.PI);
    const height = 30 + heightFactor * 60; // 高度在30%-90%之间变化
    const animationDuration = 1 + Math.random() * 1; // 1-2秒的随机动画时长
    
    // 使用白色半透明效果，与红色背景形成对比
    const color = `rgba(255, 255, 255, ${0.4 + heightFactor * 0.4})`; // 透明度根据高度变化
    
    return (
      <div
        key={`${index}-${key}`} // 添加key状态确保React正确识别更新
        className="wave-bar rounded-full"
        style={{
          width: '2px', // 更细的波形条
          backgroundColor: color,
          height: `${height}%`,
          animationDuration: `${animationDuration}s`,
          animationDelay: `${index * 0.1}s`,
          transform: 'translateZ(0)', // 启用GPU加速
          WebkitTransform: 'translateZ(0)',
          margin: '0 1px' // 减小间距以适应小区域
        }}
      />
    );
  });
  
  if (!mounted) return null;
  
  return (
    <div 
      className="wave-container absolute flex items-center justify-center pointer-events-none z-[1]"
      style={{
        transform: 'translateZ(0)', // 启用GPU加速
        WebkitTransform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        width: '100%',
        height: '100%'
      }}
    >
      <div className="relative h-[100%] w-[100%] flex items-end justify-center gap-[1px]">
        {/* 波形条 */}
        {waveBars}
        
        {/* 音符 - 限制在小区域，使用白色 */}
        {musicNotes.map((note, index) => (
          <div
            key={`${index}-${key}`} // 添加key状态确保React正确识别更新
            className="music-note absolute"
            style={{
              top: '10px',
              left: note.left,
              fontSize: note.size,
              color: 'rgba(255, 255, 255, 0.8)', // 使用白色
              animationDelay: note.delay,
              animationDuration: note.duration,
              transform: `rotate(${note.rotation}deg) translateZ(0)`, // 启用GPU加速
              WebkitTransform: `rotate(${note.rotation}deg) translateZ(0)`,
              willChange: 'transform, opacity',
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              pointerEvents: 'none' // 确保不会干扰用户交互
            }}
          >
            {note.icon}
          </div>
        ))}
      </div>
    </div>
  );
};

export const LandingPage: React.FC = () => {
  const router = useRouter()
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  })

  const handleStartClick = () => {
    router.push('/analysis')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative min-h-screen pt-20 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Guitar<span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-md shadow-md ml-1 relative">
              Muse
              <div className="absolute inset-0 overflow-hidden rounded-md">
                <AudioWaveSimple />
              </div>
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
            智能音乐分析工具，告别手写功能谱
          </p>
          <motion.button
            onClick={handleStartClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold flex items-center gap-2 mx-auto hover:bg-blue-700 transition-colors"
          >
            开始使用
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </section>

      {/* Features Section */}
      <section ref={ref} className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            强大功能，简单使用
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            三步轻松上手
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: '上传音频',
                description: '支持MP3、WAV等常见音频格式'
              },
              {
                step: '2',
                title: '智能分析',
                description: '自动识别和弦、调性和节奏'
              },
              {
                step: '3',
                title: '获取谱表',
                description: '生成清晰的功能谱，支持导出分享'
              }
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                className="relative"
              >
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-bold mb-6"
          >
            准备好开始了吗？
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8"
          >
            立即上传音频，体验智能分析
          </motion.p>
          <motion.button
            onClick={handleStartClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-blue-600 text-white px-8 py-3 rounded-full text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            免费开始使用
          </motion.button>
        </div>
      </section>
    </div>
  )
} 