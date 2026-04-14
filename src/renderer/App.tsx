import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project } from '../shared/types';
import ProjectForm from './components/ProjectForm';
import UploadPanel from './components/UploadPanel';
import SettingsForm from './components/SettingsForm';
import HistoryPanel from './components/HistoryPanel';

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const dragItemId = useRef<string | null>(null);

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

  const handleDelete = async (id: string) => {
    await window.api.deleteProject(id);
    if (selectedId === id) setSelectedId(null);
    setConfirmDeleteId(null);
    setShowForm(false);
    setEditingProject(null);
    await loadProjects();
  };

  // Drag and drop
  const handleDragStart = (id: string) => {
    dragItemId.current = id;
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragItemId.current !== id) {
      setDragOverId(id);
    }
  };

  const handleDrop = async (targetId: string) => {
    setDragOverId(null);
    const fromId = dragItemId.current;
    dragItemId.current = null;
    if (!fromId || fromId === targetId) return;

    const fromIndex = projects.findIndex(p => p.id === fromId);
    const toIndex = projects.findIndex(p => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...projects];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setProjects(reordered);
    await window.api.reorderProjects(reordered.map(p => p.id));
  };

  const handleDragEnd = () => {
    dragItemId.current = null;
    setDragOverId(null);
  };

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = () => setShowMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showMenu]);

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <span>App Uploader</span>
          <div className="menu-wrapper">
            <button
              className="icon-btn"
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            >
              ⋯
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => { setShowMenu(false); setEditingProject(null); setShowForm(true); }}>
                  <span className="dropdown-icon">+</span>新增專案
                </div>
                <div className="dropdown-item" onClick={() => { setShowMenu(false); setShowHistory(true); }}>
                  <span className="dropdown-icon">⏱</span>上傳歷史
                </div>
                <div className="dropdown-item" onClick={() => { setShowMenu(false); setShowSettings(true); }}>
                  <span className="dropdown-icon">⚙</span>全域設定
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sidebar-list">
          {projects.map(p => (
            <div
              key={p.id}
              className={`sidebar-item ${selectedId === p.id ? 'active' : ''} ${dragOverId === p.id ? 'drag-over' : ''}`}
              draggable
              onClick={() => setSelectedId(p.id)}
              onDragStart={() => handleDragStart(p.id)}
              onDragOver={(e) => handleDragOver(e, p.id)}
              onDragLeave={() => setDragOverId(null)}
              onDrop={() => handleDrop(p.id)}
              onDragEnd={handleDragEnd}
            >
              <span className="sidebar-item-name">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="main">
        {selectedProject ? (
          <>
            <div className="main-header">
              <h2>{selectedProject.name}</h2>
              <button
                className="icon-btn"
                onClick={() => { setEditingProject(selectedProject); setShowForm(true); }}
                title="編輯設定"
              >
                ⚙
              </button>
            </div>
            <div className="main-content">
              <UploadPanel project={selectedProject} />
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
          onDelete={editingProject ? () => { setShowForm(false); setConfirmDeleteId(editingProject.id); } : undefined}
        />
      )}

      {showSettings && (
        <SettingsForm onClose={() => setShowSettings(false)} />
      )}

      {showHistory && (
        <HistoryPanel onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}
