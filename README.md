# GuitarMuse
## (guitarmuse-audio-api)

GuitarMuse 是一个基于 Next.js 的音乐分析工具，可以帮助音乐人分析和理解音乐作品的和弦进行。

## 功能特点

- 音频文件分析
- 和弦进行识别
- 调性检测
- 节奏分析
- 可视化展示

## 开始使用

首先，运行开发服务器：

```bash
npm run dev
# 或者
yarn dev
# 或者
pnpm dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 查看结果。

## 部署

本项目支持两种部署方式：

1. 使用 Docker 部署：
```bash
docker build -t guitarmuse .
docker run -p 3000:3000 guitarmuse
```

2. 使用 Vercel 部署：
访问 [Vercel Platform](https://vercel.com/new) 一键部署。

## 了解更多

要了解更多关于 Next.js 的信息，请查看以下资源：

- [Next.js 文档](https://nextjs.org/docs)
- [Next.js 学习教程](https://nextjs.org/learn)

## 贡献

欢迎提交 Pull Request 和 Issue！
