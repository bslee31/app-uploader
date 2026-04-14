import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { ProjectStore } from './project-store';
import { GoogleUploader } from './google-uploader';
import { AppleUploader } from './apple-uploader';
import { GoogleQuery } from './google-query';
import { AppleQuery } from './apple-query';
import { FirebaseUploader } from './firebase-uploader';
import { SettingsStore } from './settings-store';
import { HistoryStore } from './history-store';

let mainWindow: BrowserWindow | null = null;
const projectStore = new ProjectStore();
const settingsStore = new SettingsStore();
const historyStore = new HistoryStore();

const platformNames: Record<string, string> = { apple: 'Apple TestFlight', google: 'Google Play', firebase: 'Firebase dSYM' };

function recordUpload(projectName: string, platform: 'apple' | 'google' | 'firebase', fileName: string, success: boolean, message: string, timestamp: string) {
  historyStore.add({ projectName, platform, fileName, success, message, timestamp });
  mainWindow?.webContents.send('upload:notification', {
    title: success ? '上傳成功' : '上傳失敗',
    body: `${projectName} — ${platformNames[platform] || platform}`,
  });
}

const GITHUB_REPO = 'bslee31/app-uploader';

function checkForUpdates() {
  const currentVersion = app.getVersion();
  const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

  https.get(url, { headers: { 'User-Agent': 'App-Uploader' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const release = JSON.parse(data);
        const latestVersion = (release.tag_name || '').replace(/^v/, '');
        if (latestVersion && latestVersion !== currentVersion) {
          mainWindow?.webContents.send('update:available', {
            version: latestVersion,
            url: release.html_url,
          });
        }
      } catch {}
    });
  }).on('error', () => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
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

  mainWindow.webContents.on('did-finish-load', () => {
    checkForUpdates();
  });

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

// Upload history
ipcMain.handle('history:list', () => historyStore.list());
ipcMain.handle('history:clear', () => historyStore.clear());

// Open external URL
ipcMain.handle('shell:openExternal', (_event, url: string) => shell.openExternal(url));

// Export / Import
ipcMain.handle('config:export', async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: 'app-uploader-config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePath) return { success: false };

  const data = {
    projects: projectStore.list(),
    settings: settingsStore.get(),
  };
  fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
  return { success: true, message: `已匯出至 ${result.filePath}` };
});

ipcMain.handle('config:import', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (result.canceled || !result.filePaths[0]) return { success: false };

  try {
    const raw = fs.readFileSync(result.filePaths[0], 'utf-8');
    const data = JSON.parse(raw);

    if (!data.projects || !Array.isArray(data.projects)) {
      return { success: false, message: '無效的設定檔格式' };
    }

    projectStore.importAll(data.projects);
    if (data.settings) {
      settingsStore.update(data.settings);
    }
    return { success: true, message: `已匯入 ${data.projects.length} 個專案` };
  } catch {
    return { success: false, message: '無法讀取設定檔' };
  }
});

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
    recordUpload(project.name, 'google', path.basename(aabPath), result.success, result.message, result.timestamp);
    return result;
  } catch (err: any) {
    const timestamp = new Date().toISOString();
    recordUpload(project.name, 'google', path.basename(aabPath), false, err.message, timestamp);
    return { success: false, message: err.message, platform: 'google', timestamp };
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
    recordUpload(project.name, 'apple', path.basename(ipaPath), result.success, result.message, result.timestamp);
    return result;
  } catch (err: any) {
    const timestamp = new Date().toISOString();
    recordUpload(project.name, 'apple', path.basename(ipaPath), false, err.message, timestamp);
    return { success: false, message: err.message, platform: 'apple', timestamp };
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
    recordUpload(project.name, 'firebase', path.basename(dsymPath), result.success, result.message, result.timestamp);
    return result;
  } catch (err: any) {
    const timestamp = new Date().toISOString();
    recordUpload(project.name, 'firebase', path.basename(dsymPath), false, err.message, timestamp);
    return { success: false, message: err.message, platform: 'firebase', timestamp };
  }
});
