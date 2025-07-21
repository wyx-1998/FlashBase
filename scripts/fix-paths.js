#!/usr/bin/env node

/**
 * 修复构建后的HTML文件中的资源路径
 * 将绝对路径转换为相对路径，解决Electron打包后的资源加载问题
 */

const fs = require('fs');
const path = require('path');

const htmlFilePath = path.join(__dirname, '../dist/renderer/index.html');

if (!fs.existsSync(htmlFilePath)) {
  console.error('HTML文件不存在:', htmlFilePath);
  process.exit(1);
}

let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

// 修复资源路径：将绝对路径转换为相对路径
htmlContent = htmlContent.replace(/src="\/assets\//g, 'src="./assets/');
htmlContent = htmlContent.replace(/href="\/assets\//g, 'href="./assets/');

fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');

console.log('✅ HTML文件路径修复完成');
console.log('📁 文件位置:', htmlFilePath);