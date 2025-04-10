import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from './components/navbar'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GuitarMuse - AI功能谱",
  description: "智能音乐分析工具，一键生成吉他功能谱，让学习乐理更简单",
};

// 不要在layout文件中导出headers，这会导致构建错误
// export const headers = {
//   'Cache-Control': 'no-store, must-revalidate',
//   'Pragma': 'no-cache',
//   'Expires': '0',
// };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
}
