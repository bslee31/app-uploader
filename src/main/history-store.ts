import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { HistoryEntry } from '../shared/types';

const MAX_ENTRIES = 100;

export class HistoryStore {
  private filePath: string;
  private entries: HistoryEntry[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'upload-history.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.entries = JSON.parse(data);
      }
    } catch {
      this.entries = [];
    }
  }

  private save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.entries, null, 2), 'utf-8');
  }

  list(): HistoryEntry[] {
    return this.entries;
  }

  add(entry: Omit<HistoryEntry, 'id'>): HistoryEntry {
    const record: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
    };
    this.entries.unshift(record);
    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(0, MAX_ENTRIES);
    }
    this.save();
    return record;
  }

  clear() {
    this.entries = [];
    this.save();
  }
}
