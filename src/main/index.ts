import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { ProjectStore } from './project-store';
import { GoogleUploader } from './google-uploader';
import { AppleUploader } from './apple-uploader';

let mainWindow: BrowserWindow | null = null;
const projectStore = new ProjectStore();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    title: 'App Uploader',
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

// ===== IPC Handlers =====

// File dialog
ipcMain.handle('dialog:openFile', async (_event, filters: { name: string; extensions: string[] }[]) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters,
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Project CRUD
ipcMain.handle('project:list', () => projectStore.list());
ipcMain.handle('project:get', (_event, id: string) => projectStore.get(id));
ipcMain.handle('project:create', (_event, project) => projectStore.create(project));
ipcMain.handle('project:update', (_event, id: string, data) => projectStore.update(id, data));
ipcMain.handle('project:delete', (_event, id: string) => projectStore.delete(id));

// Google Play upload
ipcMain.handle('upload:google', async (event, projectId: string, aabPath: string) => {
  const project = projectStore.get(projectId);
  if (!project?.google) {
    return { success: false, message: 'Google Play 設定不完整', platform: 'google', timestamp: new Date().toISOString() };
  }

  const uploader = new GoogleUploader(project.google);
  try {
    const sendProgress = (msg: string) => {
      event.sender.send('upload:progress', { platform: 'google', status: 'uploading', message: msg });
    };
    const result = await uploader.upload(aabPath, sendProgress);
    return result;
  } catch (err: any) {
    return { success: false, message: err.message, platform: 'google', timestamp: new Date().toISOString() };
  }
});

// Apple TestFlight upload
ipcMain.handle('upload:apple', async (event, projectId: string, ipaPath: string) => {
  const project = projectStore.get(projectId);
  if (!project?.apple) {
    return { success: false, message: 'Apple 設定不完整', platform: 'apple', timestamp: new Date().toISOString() };
  }

  const uploader = new AppleUploader(project.apple);
  try {
    const sendProgress = (msg: string) => {
      event.sender.send('upload:progress', { platform: 'apple', status: 'uploading', message: msg });
    };
    const result = await uploader.upload(ipaPath, sendProgress);
    return result;
  } catch (err: any) {
    return { success: false, message: err.message, platform: 'apple', timestamp: new Date().toISOString() };
  }
});
