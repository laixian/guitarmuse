const fs = require('fs')
const path = require('path')

const uploadDir = path.join(process.cwd(), 'public', 'uploads')

// 创建上传目录
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
  console.log('创建上传目录:', uploadDir)
} else {
  console.log('上传目录已存在:', uploadDir)
} 