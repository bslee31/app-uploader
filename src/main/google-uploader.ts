import { google } from 'googleapis';
import fs from 'fs';
import { GoogleConfig, UploadResult } from '../shared/types';

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
      // 1. Create edit
      onProgress('正在建立編輯工作階段...', 20);
      const editResponse = await publisher.edits.insert({ packageName, requestBody: {} });
      const editId = editResponse.data.id!;

      // 2. Upload AAB
      onProgress('正在上傳 AAB 檔案...', 40);
      const fileStream = fs.createReadStream(aabPath);
      const uploadResponse = await publisher.edits.bundles.upload({
        packageName,
        editId,
        media: {
          mimeType: 'application/octet-stream',
          body: fileStream,
        },
      });
      const versionCode = uploadResponse.data.versionCode;

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
