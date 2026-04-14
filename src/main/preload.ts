import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // File dialog
  openFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),

  // Project CRUD
  listProjects: () => ipcRenderer.invoke('project:list'),
  createProject: (project: any) => ipcRenderer.invoke('project:create', project),
  updateProject: (id: string, data: any) => ipcRenderer.invoke('project:update', id, data),
  deleteProject: (id: string) => ipcRenderer.invoke('project:delete', id),
  reorderProjects: (orderedIds: string[]) => ipcRenderer.invoke('project:reorder', orderedIds),

  // App settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: any) => ipcRenderer.invoke('settings:update', data),

  // Upload
  uploadGoogle: (projectId: string, aabPath: string) =>
    ipcRenderer.invoke('upload:google', projectId, aabPath),
  uploadApple: (projectId: string, ipaPath: string) =>
    ipcRenderer.invoke('upload:apple', projectId, ipaPath),
  uploadDsym: (projectId: string, dsymPath: string) =>
    ipcRenderer.invoke('upload:dsym', projectId, dsymPath),

  // Query builds
  queryGoogle: (projectId: string) => ipcRenderer.invoke('query:google', projectId),
  queryApple: (projectId: string) => ipcRenderer.invoke('query:apple', projectId),

  // Upload progress listener
  onUploadProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('upload:progress', listener);
    return () => ipcRenderer.removeListener('upload:progress', listener);
  },
});
