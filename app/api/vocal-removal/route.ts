import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { exec } from 'child_process';
import getConfig from 'next/config';

// 获取服务器配置
const { serverRuntimeConfig } = getConfig();
const tempDir = serverRuntimeConfig.tempDir || path.join(process.cwd(), 'temp');

// 确保临时目录存在
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// 处理音频文件，移除人声
export async function POST(request: NextRequest) {
  try {
    // 获取上传的音频文件
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: '未提供音频文件' },
        { status: 400 }
      );
    }
    
    // 将上传的文件保存到临时目录
    const tempFilePath = path.join(tempDir, `upload-${Date.now()}-${audioFile.name}`);
    const resultFilePath = path.join(tempDir, `processed-${Date.now()}-${audioFile.name}`);
    
    // 将文件写入临时目录
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    fs.writeFileSync(tempFilePath, buffer);
    
    console.log(`文件已保存到临时路径: ${tempFilePath}`);
    
    try {
      // 模拟人声移除处理
      // 在真实项目中，这里会调用专业的音频处理库或服务
      // 例如Spleeter, Deezer等
      
      // 目前我们简单地复制文件作为示例
      fs.copyFileSync(tempFilePath, resultFilePath);
      
      // 在现实项目中，处理人声移除可能会使用以下代码：
      // const execPromise = util.promisify(exec);
      // await execPromise(`spleeter separate -i "${tempFilePath}" -o "${tempDir}" -p spleeter:2stems`);
      
      // 模拟处理耗时
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 读取处理后的音频文件
      const processedFile = fs.readFileSync(resultFilePath);
      
      // 清理临时文件
      try {
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(resultFilePath);
        console.log('临时文件已清理');
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
      
      // 返回处理后的音频文件
      return new NextResponse(processedFile, {
        headers: {
          'Content-Type': getMimeType(audioFile.name)
        }
      });
    } catch (processingError) {
      console.error('人声移除处理失败:', processingError);
      
      // 清理临时文件
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        if (fs.existsSync(resultFilePath)) fs.unlinkSync(resultFilePath);
      } catch (cleanupError) {
        console.error('清理临时文件失败:', cleanupError);
      }
      
      return NextResponse.json(
        { error: '人声移除处理失败' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('处理请求失败:', error);
    return NextResponse.json(
      { error: '服务器处理请求失败' },
      { status: 500 }
    );
  }
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