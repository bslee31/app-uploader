import { execFile } from 'child_process';
import fs from 'fs';
import { UploadResult } from '../shared/types';

export class FirebaseUploader {
  private plistPath: string;
  private uploadSymbolsPath: string;

  constructor(plistPath: string, uploadSymbolsPath: string) {
    this.plistPath = plistPath;
    this.uploadSymbolsPath = uploadSymbolsPath;
  }

  async upload(dsymPath: string, onProgress: (msg: string, progress: number) => void): Promise<UploadResult> {
    const timestamp = new Date().toISOString();

    if (!fs.existsSync(dsymPath)) {
      return { success: false, message: `檔案不存在: ${dsymPath}`, platform: 'firebase', timestamp };
    }

    if (!fs.existsSync(this.plistPath)) {
      return { success: false, message: `GoogleService-Info.plist 不存在: ${this.plistPath}`, platform: 'firebase', timestamp };
    }

    if (!fs.existsSync(this.uploadSymbolsPath)) {
      return { success: false, message: `upload-symbols 不存在，請在全域設定中設定路徑`, platform: 'firebase', timestamp };
    }

    onProgress('正在上傳 dSYM 到 Firebase Crashlytics...', -1);

    return new Promise((resolve) => {
      const args = [
        '-gsp', this.plistPath,
        '-p', 'ios',
        dsymPath,
      ];

      const child = execFile(this.uploadSymbolsPath, args, { timeout: 300000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            message: `上傳失敗: ${stderr || error.message}`,
            platform: 'firebase',
            timestamp,
          });
          return;
        }

        resolve({
          success: true,
          message: 'dSYM 上傳成功！',
          platform: 'firebase',
          timestamp,
        });
      });

      child.stdout?.on('data', (data: string) => {
        onProgress(data.trim(), -1);
      });

      child.stderr?.on('data', (data: string) => {
        const trimmed = data.trim();
        if (trimmed) onProgress(trimmed, -1);
      });
    });
  }
}
