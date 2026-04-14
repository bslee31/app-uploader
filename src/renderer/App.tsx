import React, { useState, useEffect, useCallback } from 'react';
import { Project } from '../shared/types';
import ProjectForm from './components/ProjectForm';
import UploadPanel from './components/UploadPanel';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const loadProjects = useCallback(async () => {
    const list = await window.api.listProjects();
    setProjects(list);
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const selectedProject = projects.find(p => p.id === selectedId) || null;

  const handleCreate = async (data: any) => {
    await window.api.createProject(data);
    await loadProjects();
    setShowForm(false);
  };

  const handleUpdate = async (data: any) => {
    if (!editingProject) return;
    await window.api.updateProject(editingProject.id, data);
    await loadProjects();
    setEditingProject(null);
    setShowForm(false);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    await window.api.deleteProject(id);
    if (selectedId === id) setSelectedId(null);
    setConfirmDeleteId(null);
    await loadProjects();
  };

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">App Uploader</div>
        <div className="sidebar-list">
          {projects.map(p => (
            <div
              key={p.id}
              className={`sidebar-item ${selectedId === p.id ? 'active' : ''}`}
              onClick={() => setSelectedId(p.id)}
            >
              {p.name}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button
            className="btn btn-primary btn-full"
            onClick={() => { setEditingProject(null); setShowForm(true); }}
          >
            + 新增專案
          </button>
        </div>
      </div>

      <div className="main">
        {selectedProject ? (
          <>
            <div className="main-header">
              <h2>{selectedProject.name}</h2>
            </div>
            <div className="main-content">
              <UploadPanel project={selectedProject} />

              <div className="section">
                <div className="section-title">專案設定</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setEditingProject(selectedProject); setShowForm(true); }}
                  >
                    編輯設定
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setConfirmDeleteId(selectedProject.id)}
                  >
                    刪除專案
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="main-content">
            <div className="empty-state">
              <p>請從左側選擇專案，或新增一個專案</p>
            </div>
          </div>
        )}
      </div>

      {confirmDeleteId && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>確認刪除</h3>
            <p>確定要刪除專案「{projects.find(p => p.id === confirmDeleteId)?.name}」嗎？此操作無法復原。</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)}>
                確認刪除
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <ProjectForm
          project={editingProject}
          onSubmit={editingProject ? handleUpdate : handleCreate}
          onCancel={() => { setShowForm(false); setEditingProject(null); }}
        />
      )}
    </div>
  );
}
