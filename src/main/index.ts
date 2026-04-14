import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { ProjectStore } from './project-store';
import { GoogleUploader } from './google-uploader';
import { AppleUploader } from './apple-uploader';
import { GoogleQuery } from './google-query';
import { AppleQuery } from './apple-query';
import { FirebaseUploader } from './firebase-uploader';
import { SettingsStore } from './settings-store';

let mainWindow: BrowserWindow | null = null;
const projectStore = new ProjectStore();
const settingsStore = new SettingsStore();

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

ipcMain.handle('dialog:openFileOrDirectory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// Project CRUD
ipcMain.handle('project:list', () => projectStore.list());
ipcMain.handle('project:create', (_event, project) => projectStore.create(project));
ipcMain.handle('project:update', (_event, id: string, data) => projectStore.update(id, data));
ipcMain.handle('project:delete', (_event, id: string) => projectStore.delete(id));
ipcMain.handle('project:reorder', (_event, orderedIds: string[]) => projectStore.reorder(orderedIds));

// App settings
ipcMain.handle('settings:get', () => settingsStore.get());
ipcMain.handle('settings:update', (_event, data) => settingsStore.update(data));

// Google Play upload
ipcMain.handle('upload:google', async (event, projectId: string, aabPath: string) => {
  const project = projectStore.get(projectId);
  if (!project?.google) {
    return { success: false, message: 'Google Play 設定不完整', platform: 'google', timestamp: new Date().toISOString() };
  }

  const uploader = new GoogleUploader(project.google);
  try {
    const sendProgress = (msg: string, progress: number) => {
      event.sender.send('upload:progress', { projectId, platform: 'google', status: 'uploading', message: msg, progress });
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
    const sendProgress = (msg: string, progress: number) => {
      event.sender.send('upload:progress', { projectId, platform: 'apple', status: 'uploading', message: msg, progress });
    };
    const result = await uploader.upload(ipaPath, sendProgress);
    return result;
  } catch (err: any) {
    return { success: false, message: err.message, platform: 'apple', timestamp: new Date().toISOString() };
  }
});

// Query builds
ipcMain.handle('query:google', async (_event, projectId: string) => {
  const project = projectStore.get(projectId);
  if (!project?.google) {
    return { success: false, message: 'Google Play 設定不完整', builds: [] };
  }
  const query = new GoogleQuery(project.google);
  return query.listBundles();
});

ipcMain.handle('query:apple', async (_event, projectId: string) => {
  const project = projectStore.get(projectId);
  if (!project?.apple) {
    return { success: false, message: 'Apple 設定不完整', builds: [] };
  }
  if (!project.apple.bundleId) {
    return { success: false, message: '請先在專案設定中填寫 Bundle ID', builds: [] };
  }
  const query = new AppleQuery(project.apple);
  return query.listBuilds();
});

// Firebase dSYM upload
ipcMain.handle('upload:dsym', async (event, projectId: string, dsymPath: string) => {
  const project = projectStore.get(projectId);
  if (!project?.apple?.googleServiceInfoPlistPath) {
    return { success: false, message: '請先在專案設定中選擇 GoogleService-Info.plist', platform: 'firebase', timestamp: new Date().toISOString() };
  }

  const settings = settingsStore.get();
  if (!settings.uploadSymbolsPath) {
    return { success: false, message: '請先在全域設定中設定 upload-symbols 路徑', platform: 'firebase', timestamp: new Date().toISOString() };
  }

  const uploader = new FirebaseUploader(project.apple.googleServiceInfoPlistPath, settings.uploadSymbolsPath);
  try {
    const sendProgress = (msg: string, progress: number) => {
      event.sender.send('upload:progress', { projectId, platform: 'firebase', status: 'uploading', message: msg, progress });
    };
    const result = await uploader.upload(dsymPath, sendProgress);
    return result;
  } catch (err: any) {
    return { success: false, message: err.message, platform: 'firebase', timestamp: new Date().toISOString() };
  }
});
