import fs from 'fs';
import path from 'path';
import os from 'os';
import { app } from 'electron';
import { Project } from '../shared/types';

export class ProjectStore {
  private filePath: string;
  private projects: Project[] = [];

  constructor() {
    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, 'projects.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        this.projects = JSON.parse(data);
      }
    } catch {
      this.projects = [];
    }
  }

  private save() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.projects, null, 2), 'utf-8');
  }

  list(): Project[] {
    return this.projects;
  }

  get(id: string): Project | undefined {
    return this.projects.find(p => p.id === id);
  }

  private installP8Key(p8Path: string): string {
    const destDir = path.join(os.homedir(), '.appstoreconnect', 'private_keys');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const fileName = path.basename(p8Path);
    const destPath = path.join(destDir, fileName);

    if (destPath !== p8Path) {
      fs.copyFileSync(p8Path, destPath);
    }

    return destPath;
  }

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    if (data.apple?.p8KeyPath && fs.existsSync(data.apple.p8KeyPath)) {
      data.apple.p8KeyPath = this.installP8Key(data.apple.p8KeyPath);
    }

    const project: Project = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.projects.push(project);
    this.save();
    return project;
  }

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return null;

    if (data.apple?.p8KeyPath && fs.existsSync(data.apple.p8KeyPath)) {
      data.apple.p8KeyPath = this.installP8Key(data.apple.p8KeyPath);
    }

    this.projects[index] = {
      ...this.projects[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.projects[index];
  }

  reorder(orderedIds: string[]) {
    const map = new Map(this.projects.map(p => [p.id, p]));
    this.projects = orderedIds.map(id => map.get(id)!).filter(Boolean);
    this.save();
  }

  importAll(projects: Project[]) {
    this.projects = projects;
    this.save();
  }

  delete(id: string): boolean {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.projects.splice(index, 1);
    this.save();
    return true;
  }
}
