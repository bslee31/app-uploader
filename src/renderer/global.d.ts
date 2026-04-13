export {};

declare global {
  interface Window {
    api: {
      openFile: (filters: { name: string; extensions: string[] }[]) => Promise<string | null>;
      listProjects: () => Promise<import('../shared/types').Project[]>;
      getProject: (id: string) => Promise<import('../shared/types').Project | undefined>;
      createProject: (project: any) => Promise<import('../shared/types').Project>;
      updateProject: (id: string, data: any) => Promise<import('../shared/types').Project | null>;
      deleteProject: (id: string) => Promise<boolean>;
      uploadGoogle: (projectId: string, aabPath: string) => Promise<import('../shared/types').UploadResult>;
      uploadApple: (projectId: string, ipaPath: string) => Promise<import('../shared/types').UploadResult>;
      onUploadProgress: (callback: (progress: import('../shared/types').UploadProgress) => void) => () => void;
    };
  }
}
