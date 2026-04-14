import { execFile } from 'child_process';
import fs from 'fs';
import { AppleConfig, UploadResult } from '../shared/types';

export class AppleUploader {
  private config: AppleConfig;

  constructor(config: AppleConfig) {
    this.config = config;
  }

  async upload(ipaPath: string, onProgress: (msg: string, progress: number) => void): Promise<UploadResult> {
    const timestamp = new Date().toISOString();

    if (!fs.existsSync(ipaPath)) {
      return { success: false, message: `檔案不存在: ${ipaPath}`, platform: 'apple', timestamp };
    }

    if (!fs.existsSync(this.config.p8KeyPath)) {
      return { success: false, message: `API Key (.p8) 不存在: ${this.config.p8KeyPath}`, platform: 'apple', timestamp };
    }

    onProgress('正在上傳 IPA 到 TestFlight...', -1);

    return new Promise((resolve) => {
      const args = [
        'altool',
        '--upload-app',
        '-f', ipaPath,
        '-t', 'ios',
        '--apiKey', this.config.apiKeyId,
        '--apiIssuer', this.config.issuerId,
      ];

      const child = execFile('xcrun', args, { timeout: 600000 }, (error, stdout, stderr) => {
        if (error) {
          resolve({
            success: false,
            message: `上傳失敗: ${stderr || error.message}`,
            platform: 'apple',
            timestamp,
          });
          return;
        }

        resolve({
          success: true,
          message: `上傳成功！${stdout.trim()}`,
          platform: 'apple',
          timestamp,
        });
      });

      child.stdout?.on('data', (data: string) => {
        onProgress(data.trim(), -1);
      });
    });
  }
}
