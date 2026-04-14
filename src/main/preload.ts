import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // File dialog
  openFile: (filters: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),
  openFileOrDirectory: () =>
    ipcRenderer.invoke('dialog:openFileOrDirectory'),

  // Project CRUD
  listProjects: () => ipcRenderer.invoke('project:list'),
  createProject: (project: any) => ipcRenderer.invoke('project:create', project),
  updateProject: (id: string, data: any) => ipcRenderer.invoke('project:update', id, data),
  deleteProject: (id: string) => ipcRenderer.invoke('project:delete', id),
  reorderProjects: (orderedIds: string[]) => ipcRenderer.invoke('project:reorder', orderedIds),

  // App settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (data: any) => ipcRenderer.invoke('settings:update', data),

  // Export / Import
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),

  // Upload history
  listHistory: () => ipcRenderer.invoke('history:list'),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

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

  // Notification listener
  onUploadNotification: (callback: (data: { title: string; body: string }) => void) => {
    const listener = (_event: any, data: any) => callback(data);
    ipcRenderer.on('upload:notification', listener);
    return () => ipcRenderer.removeListener('upload:notification', listener);
  },

  // Upload progress listener
  onUploadProgress: (callback: (progress: any) => void) => {
    const listener = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('upload:progress', listener);
    return () => ipcRenderer.removeListener('upload:progress', listener);
  },
});
