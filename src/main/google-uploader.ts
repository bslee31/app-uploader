import { google } from 'googleapis';
import fs from 'fs';
import { GoogleConfig, UploadResult } from '../shared/types';
import { extractVersionNameFromAab } from './aab-parser';

const RETRYABLE_NETWORK_ERRORS = ['ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ECONNABORTED', 'EAI_AGAIN', 'socket hang up', 'network timeout'];

function isRetryableNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return RETRYABLE_NETWORK_ERRORS.some((code) => message.includes(code));
}

export class GoogleUploader {
  private config: GoogleConfig;

  constructor(config: GoogleConfig) {
    this.config = config;
  }

  async upload(aabPath: string, onProgress: (msg: string, progress: number) => void): Promise<UploadResult> {
    const timestamp = new Date().toISOString();

    if (!fs.existsSync(aabPath)) {
      return { success: false, message: `檔案不存在: ${aabPath}`, platform: 'google', timestamp };
    }

    if (!fs.existsSync(this.config.serviceAccountKeyPath)) {
      return { success: false, message: `Service Account 金鑰不存在: ${this.config.serviceAccountKeyPath}`, platform: 'google', timestamp };
    }

    onProgress('正在驗證 Google Play 憑證...', 10);

    const auth = new google.auth.GoogleAuth({
      keyFile: this.config.serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const publisher = google.androidpublisher({ version: 'v3', auth });
    const packageName = this.config.packageName;

    try {
      const fileSize = fs.statSync(aabPath).size;
      const maxAttempts = 3;
      let editId = '';
      let versionCode: number | null | undefined;

      // 1+2. Create edit and upload AAB, retrying on transient network errors.
      // A failed upload may leave the edit in an unknown state, so each attempt
      // starts a fresh edit.
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          onProgress(attempt === 1 ? '正在建立編輯工作階段...' : `連線中斷，正在重試 (第 ${attempt}/${maxAttempts} 次)...`, 20);
          const editResponse = await publisher.edits.insert({ packageName, requestBody: {} });
          editId = editResponse.data.id!;

          onProgress('正在上傳 AAB 檔案...', 40);
          const uploadResponse = await publisher.edits.bundles.upload(
            {
              packageName,
              editId,
              media: {
                mimeType: 'application/octet-stream',
                body: fs.createReadStream(aabPath),
              },
            },
            {
              timeout: 30 * 60 * 1000,
              onUploadProgress: (evt: { bytesRead: number }) => {
                const fraction = Math.min(evt.bytesRead / fileSize, 1);
                onProgress(`正在上傳 AAB 檔案... ${Math.round(fraction * 100)}%`, 40 + fraction * 30);
              },
            },
          );
          versionCode = uploadResponse.data.versionCode;
          break;
        } catch (err) {
          if (attempt === maxAttempts || !isRetryableNetworkError(err)) throw err;
          await new Promise((resolve) => setTimeout(resolve, attempt * 3000));
        }
      }

      const versionName = extractVersionNameFromAab(aabPath);
      const releaseName = versionName ? `${versionCode} (${versionName})` : String(versionCode);

      // 3. Assign to internal track
      onProgress('正在指派到內部測試軌道...', 70);
      await publisher.edits.tracks.update({
        packageName,
        editId,
        track: 'internal',
        requestBody: {
          track: 'internal',
          releases: [
            {
              name: releaseName,
              versionCodes: [String(versionCode)],
              status: this.config.releaseStatus || 'draft',
            },
          ],
        },
      });

      // 4. Commit
      onProgress('正在提交變更...', 90);
      await publisher.edits.commit({ packageName, editId });

      return {
        success: true,
        message: `上傳成功！Version Code: ${versionCode}`,
        platform: 'google',
        timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `上傳失敗: ${err.message}`,
        platform: 'google',
        timestamp,
      };
    }
  }
}
