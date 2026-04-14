import fs from 'fs';
import https from 'https';
import jwt from 'jsonwebtoken';
import { AppleConfig, QueryResult } from '../shared/types';

export class AppleQuery {
  private config: AppleConfig;

  constructor(config: AppleConfig) {
    this.config = config;
  }

  private generateToken(): string {
    const privateKey = fs.readFileSync(this.config.p8KeyPath, 'utf-8');

    return jwt.sign({}, privateKey, {
      algorithm: 'ES256',
      keyid: this.config.apiKeyId,
      issuer: this.config.issuerId,
      expiresIn: 1200,
      audience: 'appstoreconnect-v1',
    });
  }

  private request(url: string, token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const req = https.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`API 回應 ${res.statusCode}: ${data}`));
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('無法解析 API 回應'));
          }
        });
      });
      req.on('error', reject);
    });
  }

  async listBuilds(): Promise<QueryResult> {
    if (!fs.existsSync(this.config.p8KeyPath)) {
      return { success: false, message: `API Key (.p8) 不存在: ${this.config.p8KeyPath}`, builds: [] };
    }

    try {
      const token = this.generateToken();

      // 1. Find app by bundleId
      const bundleId = encodeURIComponent(this.config.bundleId);
      const appsUrl = `https://api.appstoreconnect.apple.com/v1/apps?filter[bundleId]=${bundleId}`;
      const appsResponse = await this.request(appsUrl, token);
      const apps = appsResponse.data || [];

      if (apps.length === 0) {
        return { success: false, message: `找不到 Bundle ID 為 ${this.config.bundleId} 的 App`, builds: [] };
      }

      const appId = apps[0].id;

      // 2. Get recent builds with preReleaseVersion
      const buildsUrl = `https://api.appstoreconnect.apple.com/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=10&include=preReleaseVersion`;
      const buildsResponse = await this.request(buildsUrl, token);
      const buildsData = buildsResponse.data || [];
      const included = buildsResponse.included || [];

      if (buildsData.length === 0) {
        return { success: true, message: '目前沒有任何 build', builds: [] };
      }

      // Map preReleaseVersion IDs to version strings
      const versionMap: Record<string, string> = {};
      for (const item of included) {
        if (item.type === 'preReleaseVersions') {
          versionMap[item.id] = item.attributes?.version || '-';
        }
      }

      const builds = buildsData.map((build: any) => {
        const preReleaseId = build.relationships?.preReleaseVersion?.data?.id;
        return {
          version: versionMap[preReleaseId] || '-',
          buildNumber: build.attributes.version || '-',
          status: build.attributes.processingState || 'unknown',
          updatedAt: build.attributes.uploadedDate || '',
        };
      });

      return { success: true, message: `找到 ${builds.length} 個版本`, builds };
    } catch (err: any) {
      return { success: false, message: `查詢失敗: ${err.message}`, builds: [] };
    }
  }
}
