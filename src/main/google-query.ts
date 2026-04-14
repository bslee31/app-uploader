import { google } from 'googleapis';
import fs from 'fs';
import { GoogleConfig, QueryResult } from '../shared/types';

export class GoogleQuery {
  private config: GoogleConfig;

  constructor(config: GoogleConfig) {
    this.config = config;
  }

  async listBundles(): Promise<QueryResult> {
    if (!fs.existsSync(this.config.serviceAccountKeyPath)) {
      return { success: false, message: `Service Account 金鑰不存在: ${this.config.serviceAccountKeyPath}`, builds: [] };
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: this.config.serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    const publisher = google.androidpublisher({ version: 'v3', auth });
    const packageName = this.config.packageName;

    try {
      const editResponse = await publisher.edits.insert({ packageName, requestBody: {} });
      const editId = editResponse.data.id!;

      const tracksResponse = await publisher.edits.tracks.list({ packageName, editId });
      const tracks = tracksResponse.data.tracks || [];

      const builds = tracks.flatMap(track => {
        const trackName = track.track || 'unknown';
        return (track.releases || []).flatMap(release =>
          (release.versionCodes || []).map(vc => ({
            version: release.name || '-',
            buildNumber: String(vc),
            status: `${trackName} (${release.status || 'unknown'})`,
            updatedAt: '',
          }))
        );
      });

      // Don't commit the edit - we're only reading
      await publisher.edits.delete({ packageName, editId });

      if (builds.length === 0) {
        return { success: true, message: '目前沒有任何 bundle', builds: [] };
      }

      return { success: true, message: `找到 ${builds.length} 個版本`, builds };
    } catch (err: any) {
      return { success: false, message: `查詢失敗: ${err.message}`, builds: [] };
    }
  }
}
