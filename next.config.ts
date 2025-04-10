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
