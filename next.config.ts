/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config: any) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false
    };
    return config;
  },
  // 修正Turbopack配置，使用正确的类型
  experimental: {
    // turbo配置方式与webpack不同，先移除可能导致问题的配置
    // 在Next.js 13+中，此类配置可能需要其他处理方式
  },
  serverRuntimeConfig: {
    // 将在服务器端生效但不会暴露给浏览器的配置
    tempDir: `${process.cwd()}/temp`,
  },
  // 设置合理的超时时间
  staticPageGenerationTimeout: 120,
  // 禁用页面缓存
  onDemandEntries: {
    // 页面在内存中保持的时间（毫秒）
    maxInactiveAge: 25 * 1000,
    // 同时保持的页面数量
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          }
        ]
      }
    ]
  }
};

export default nextConfig;
