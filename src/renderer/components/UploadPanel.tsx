import React, { useState, useEffect, useCallback } from 'react';
import { Project, UploadProgress } from '../../shared/types';

interface ProjectUploadState {
  aabPath: string;
  ipaPath: string;
  googleStatus: UploadProgress;
  appleStatus: UploadProgress;
}

function defaultState(projectId: string): ProjectUploadState {
  return {
    aabPath: '',
    ipaPath: '',
    googleStatus: { projectId, platform: 'google', status: 'idle', message: '' },
    appleStatus: { projectId, platform: 'apple', status: 'idle', message: '' },
  };
}

interface Props {
  project: Project;
}

export default function UploadPanel({ project }: Props) {
  const [stateMap, setStateMap] = useState<Record<string, ProjectUploadState>>({});

  const state = stateMap[project.id] || defaultState(project.id);

  const update = useCallback((projectId: string, changes: Partial<ProjectUploadState>) => {
    setStateMap(prev => ({
      ...prev,
      [projectId]: { ...(prev[projectId] || defaultState(projectId)), ...changes },
    }));
  }, []);

  useEffect(() => {
    const unsubscribe = window.api.onUploadProgress((progress: UploadProgress) => {
      const pid = progress.projectId;
      if (progress.platform === 'google') {
        update(pid, { googleStatus: progress });
      }
      if (progress.platform === 'apple') {
        update(pid, { appleStatus: progress });
      }
    });
    return unsubscribe;
  }, [update]);

  const handleSelectAab = async () => {
    const path = await window.api.openFile([{ name: 'Android App Bundle', extensions: ['aab'] }]);
    if (path) update(project.id, { aabPath: path });
  };

  const handleSelectIpa = async () => {
    const path = await window.api.openFile([{ name: 'iOS App', extensions: ['ipa'] }]);
    if (path) update(project.id, { ipaPath: path });
  };

  const handleUploadGoogle = async () => {
    if (!state.aabPath) return;
    update(project.id, {
      googleStatus: { projectId: project.id, platform: 'google', status: 'uploading', message: '準備上傳...', progress: 0 },
    });
    const result = await window.api.uploadGoogle(project.id, state.aabPath);
    update(project.id, {
      googleStatus: { projectId: project.id, platform: 'google', status: result.success ? 'success' : 'error', message: result.message },
    });
  };

  const handleUploadApple = async () => {
    if (!state.ipaPath) return;
    update(project.id, {
      appleStatus: { projectId: project.id, platform: 'apple', status: 'uploading', message: '準備上傳...', progress: -1 },
    });
    const result = await window.api.uploadApple(project.id, state.ipaPath);
    update(project.id, {
      appleStatus: { projectId: project.id, platform: 'apple', status: result.success ? 'success' : 'error', message: result.message },
    });
  };

  const isGoogleUploading = state.googleStatus.status === 'uploading';
  const isAppleUploading = state.appleStatus.status === 'uploading';

  return (
    <div className="upload-sections">
      {/* Apple */}
      <div className="section">
        <div className="section-title">Apple</div>
        {!project.apple ? (
          <p style={{ color: '#a0a0a0', fontSize: 13 }}>尚未設定 Apple</p>
        ) : (
          <>
            <div className="upload-row">
              <button className="btn btn-secondary" onClick={handleSelectIpa} disabled={isAppleUploading}>
                選擇 IPA
              </button>
              <div className="file-path-inline">{state.ipaPath || '尚未選擇檔案'}</div>
              <button
                className="btn btn-primary"
                onClick={handleUploadApple}
                disabled={!state.ipaPath || isAppleUploading}
              >
                {isAppleUploading ? '上傳中...' : '上傳'}
              </button>
            </div>
            {state.appleStatus.status !== 'idle' && (
              <div className={`status ${state.appleStatus.status}`}>
                {state.appleStatus.status === 'uploading' && (
                  <div className="progress-bar">
                    <div className="progress-bar-fill indeterminate" />
                  </div>
                )}
                {state.appleStatus.message}
              </div>
            )}
          </>
        )}
      </div>

      {/* Google Play */}
      <div className="section">
        <div className="section-title">Google Play</div>
        {!project.google ? (
          <p style={{ color: '#a0a0a0', fontSize: 13 }}>尚未設定 Google Play</p>
        ) : (
          <>
            <div className="upload-row">
              <button className="btn btn-secondary" onClick={handleSelectAab} disabled={isGoogleUploading}>
                選擇 AAB
              </button>
              <div className="file-path-inline">{state.aabPath || '尚未選擇檔案'}</div>
              <button
                className="btn btn-primary"
                onClick={handleUploadGoogle}
                disabled={!state.aabPath || isGoogleUploading}
              >
                {isGoogleUploading ? '上傳中...' : '上傳'}
              </button>
            </div>
            {state.googleStatus.status !== 'idle' && (
              <div className={`status ${state.googleStatus.status}`}>
                {state.googleStatus.status === 'uploading' && state.googleStatus.progress !== undefined && state.googleStatus.progress >= 0 && (
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${state.googleStatus.progress}%` }} />
                  </div>
                )}
                {state.googleStatus.message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
