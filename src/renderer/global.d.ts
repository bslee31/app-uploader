export {};

declare global {
  interface Window {
    api: {
      openFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>;
      openFileOrDirectory: () => Promise<string | null>;
      listProjects: () => Promise<import('../shared/types').Project[]>;
      createProject: (project: any) => Promise<import('../shared/types').Project>;
      updateProject: (id: string, data: any) => Promise<import('../shared/types').Project | null>;
      deleteProject: (id: string) => Promise<boolean>;
      reorderProjects: (orderedIds: string[]) => Promise<void>;
      getSettings: () => Promise<import('../shared/types').AppSettings>;
      updateSettings: (data: Partial<import('../shared/types').AppSettings>) => Promise<void>;
      exportConfig: () => Promise<{ success: boolean; message?: string }>;
      importConfig: () => Promise<{ success: boolean; message?: string }>;
      listHistory: () => Promise<import('../shared/types').HistoryEntry[]>;
      clearHistory: () => Promise<void>;
      inspectAab: (aabPath: string) => Promise<{ versionCode: number | null; versionName: string | null }>;
      uploadGoogle: (projectId: string, aabPath: string) => Promise<import('../shared/types').UploadResult>;
      uploadApple: (projectId: string, ipaPath: string) => Promise<import('../shared/types').UploadResult>;
      uploadDsym: (projectId: string, dsymPath: string) => Promise<import('../shared/types').UploadResult>;
      queryGoogle: (projectId: string) => Promise<import('../shared/types').QueryResult>;
      queryApple: (projectId: string) => Promise<import('../shared/types').QueryResult>;
      openExternal: (url: string) => Promise<void>;
      onUpdateAvailable: (callback: (data: { version: string; url: string }) => void) => () => void;
      onUploadNotification: (callback: (data: { title: string; body: string }) => void) => () => void;
      onUploadProgress: (callback: (progress: import('../shared/types').UploadProgress) => void) => () => void;
    };
  }
}
