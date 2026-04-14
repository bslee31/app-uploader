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

    let editId: string | null = null;

    try {
      const editResponse = await publisher.edits.insert({ packageName, requestBody: {} });
      editId = editResponse.data.id!;

      // Get all uploaded bundles
      const bundlesResponse = await publisher.edits.bundles.list({ packageName, editId });
      const bundles = bundlesResponse.data.bundles || [];

      // Get track info to map versionCode -> track/status
      const tracksResponse = await publisher.edits.tracks.list({ packageName, editId });
      const tracks = tracksResponse.data.tracks || [];

      const trackMap: Record<string, { trackStatus: string; versionName: string }> = {};
      for (const track of tracks) {
        const trackName = track.track || 'unknown';
        for (const release of track.releases || []) {
          for (const vc of release.versionCodes || []) {
            trackMap[String(vc)] = {
              trackStatus: `${trackName} (${release.status || 'unknown'})`,
              versionName: release.name || '-',
            };
          }
        }
      }

      if (bundles.length === 0) {
        return { success: true, message: '目前沒有任何 bundle', builds: [] };
      }

      const builds = bundles
        .sort((a, b) => (b.versionCode || 0) - (a.versionCode || 0))
        .map(bundle => {
          const vc = String(bundle.versionCode || 0);
          const info = trackMap[vc];
          return {
            version: info?.versionName || '-',
            buildNumber: vc,
            status: info?.trackStatus || '未指派',
            updatedAt: '',
          };
        });

      return { success: true, message: `找到 ${builds.length} 個版本`, builds };
    } catch (err: any) {
      return { success: false, message: `查詢失敗: ${err.message}`, builds: [] };
    } finally {
      if (editId) {
        try { await publisher.edits.delete({ packageName, editId }); } catch {}
      }
    }
  }
}
