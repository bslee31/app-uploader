import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppSettings } from '../shared/types';

const defaultSettings: AppSettings = {
  uploadSymbolsPath: '',
};

export class SettingsStore {
  private filePath: string;
  private settings: AppSettings;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'settings.json');
    this.settings = { ...defaultSettings };
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.settings = { ...defaultSettings, ...JSON.parse(data) };
      }
    } catch {
      this.settings = { ...defaultSettings };
    }
  }

  private save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2), 'utf-8');
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  update(data: Partial<AppSettings>) {
    this.settings = { ...this.settings, ...data };
    this.save();
  }
}
