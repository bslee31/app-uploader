export interface AppleConfig {
  apiKeyId: string;
  issuerId: string;
  p8KeyPath: string;
  bundleId: string;
}

export type GoogleReleaseStatus = 'completed' | 'draft';

export interface GoogleConfig {
  serviceAccountKeyPath: string;
  packageName: string;
  releaseStatus: GoogleReleaseStatus;
}

export interface Project {
  id: string;
  name: string;
  apple?: AppleConfig;
  google?: GoogleConfig;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  success: boolean;
  message: string;
  platform: 'apple' | 'google';
  timestamp: string;
}

export interface BuildInfo {
  version: string;
  buildNumber: string;
  status: string;
  updatedAt: string;
}

export interface QueryResult {
  success: boolean;
  message: string;
  builds: BuildInfo[];
}

export interface UploadProgress {
  projectId: string;
  platform: 'apple' | 'google';
  status: 'idle' | 'uploading' | 'success' | 'error';
  message: string;
  progress?: number;
}
