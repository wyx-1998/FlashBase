import { clipboard, desktopCapturer, nativeImage } from 'electron';
import { ClipboardContent, WindowInfo } from '../shared/types';

export class ContentExtractor {
  
  /**
   * 获取选中的文本（通过模拟复制操作）
   */
  async getSelectedText(): Promise<string> {
    try {
      // 保存当前剪贴板内容
      const originalClipboard = clipboard.readText();
      
      // 模拟 Ctrl+C 操作
      const { globalShortcut } = require('electron');
      
      // 暂时的实现：这里需要与系统更深层次的集成
      // 可能需要使用原生模块或者其他方式来获取选中文本
      
      // 简化实现：返回空字符串，表示没有选中文本
      return '';
    } catch (error) {
      console.error('获取选中文本失败:', error);
      return '';
    }
  }

  /**
   * 获取剪贴板内容
   */
  async getClipboardContent(): Promise<ClipboardContent> {
    try {
      const content: ClipboardContent = {
        text: clipboard.readText(),
        html: clipboard.readHTML(),
        rtf: clipboard.readRTF()
      };

      // 尝试获取图像
      const image = clipboard.readImage();
      if (!image.isEmpty()) {
        content.image = image.toPNG();
      }

      return content;
    } catch (error) {
      console.error('获取剪贴板内容失败:', error);
      return {};
    }
  }

  /**
   * 设置剪贴板内容
   */
  setClipboardContent(content: ClipboardContent): void {
    try {
      if (content.text) {
        clipboard.writeText(content.text);
      }
      if (content.html) {
        clipboard.writeHTML(content.html);
      }
      if (content.image) {
        const image = nativeImage.createFromBuffer(Buffer.from(content.image));
        clipboard.writeImage(image);
      }
    } catch (error) {
      console.error('设置剪贴板内容失败:', error);
    }
  }

  // 截图功能已完全移除
  // /**
  //  * 屏幕截图
  //  */
  // async captureScreen(): Promise<Uint8Array | null> {
  //   // 截图功能已移除
  //   return null;
  // }

  // 区域截图功能已完全移除
  // /**
  //  * 截取指定区域
  //  */
  // async captureRegion(bounds: { x: number; y: number; width: number; height: number }): Promise<Uint8Array | null> {
  //   // 截图功能已移除
  //   return null;
  // }

  /**
   * 从图像中提取文字 (已移除OCR功能)
   */
  async extractTextFromImage(imageBuffer: Uint8Array): Promise<string> {
    console.warn('OCR功能已被移除');
    return '';
  }

  /**
   * 从图像中提取文字 (已移除OCR功能)
   */
  async extractTextFromImageWithConfidence(imageBuffer: Uint8Array): Promise<{ text: string; confidence: number; words: any[] }> {
    console.warn('OCR功能已被移除');
    return {
      text: '',
      confidence: 0,
      words: []
    };
  }

  /**
   * 获取当前窗口信息
   */
  async getCurrentWindowInfo(): Promise<WindowInfo | null> {
    try {
      // 这里需要使用原生模块或其他方式获取当前活动窗口信息
      // 简化实现
      return {
        title: 'Unknown Window',
        processName: 'unknown',
        bounds: {
          x: 0,
          y: 0,
          width: 1920,
          height: 1080
        }
      };
    } catch (error) {
      console.error('获取窗口信息失败:', error);
      return null;
    }
  }

  /**
   * 检测内容类型
   */
  detectContentType(content: string): 'text' | 'url' | 'code' | 'json' {
    // URL 检测
    if (this.isURL(content)) {
      return 'url';
    }

    // JSON 检测
    if (this.isJSON(content)) {
      return 'json';
    }

    // 代码检测
    if (this.isCode(content)) {
      return 'code';
    }

    // 默认为文本
    return 'text';
  }

  /**
   * 检查是否为 URL
   */
  private isURL(content: string): boolean {
    try {
      new URL(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否为 JSON
   */
  private isJSON(content: string): boolean {
    try {
      JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查是否为代码
   */
  private isCode(content: string): boolean {
    const codeIndicators = [
      'function ', 'const ', 'let ', 'var ',
      'class ', 'interface ', 'type ',
      'import ', 'export ', 'require(',
      'def ', 'class ', 'if __name__',
      'public class', 'private ', 'protected ',
      '<html', '<div', '<script',
      '#!/bin/', '#include', '#define'
    ];

    return codeIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * 清理文本内容
   */
  cleanupText(text: string): string {
    return text
      .trim()
      .replace(/\r\n/g, '\n')  // 统一换行符
      .replace(/\s+$/gm, '')   // 删除行尾空格
      .replace(/\n{3,}/g, '\n\n'); // 合并多余的空行
  }
}