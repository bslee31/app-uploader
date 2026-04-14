import React, { useState, useEffect, useCallback } from 'react';
import { Project, UploadProgress, QueryResult } from '../../shared/types';

interface ProjectUploadState {
  aabPath: string;
  ipaPath: string;
  dsymPath: string;
  googleStatus: UploadProgress;
  appleStatus: UploadProgress;
  firebaseStatus: UploadProgress;
  googleQuery: QueryResult | null;
  appleQuery: QueryResult | null;
  googleQuerying: boolean;
  appleQuerying: boolean;
}

function defaultState(projectId: string): ProjectUploadState {
  return {
    aabPath: '',
    ipaPath: '',
    dsymPath: '',
    googleStatus: { projectId, platform: 'google', status: 'idle', message: '' },
    appleStatus: { projectId, platform: 'apple', status: 'idle', message: '' },
    firebaseStatus: { projectId, platform: 'firebase', status: 'idle', message: '' },
    googleQuery: null,
    appleQuery: null,
    googleQuerying: false,
    appleQuerying: false,
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
      if (progress.platform === 'firebase') {
        update(pid, { firebaseStatus: progress });
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

  const handleSelectDsym = async () => {
    const path = await window.api.openFileOrDirectory();
    if (path) update(project.id, { dsymPath: path });
  };

  const handleUploadDsym = async () => {
    if (!state.dsymPath) return;
    update(project.id, {
      firebaseStatus: { projectId: project.id, platform: 'firebase', status: 'uploading', message: '準備上傳...', progress: -1 },
    });
    const result = await window.api.uploadDsym(project.id, state.dsymPath);
    update(project.id, {
      firebaseStatus: { projectId: project.id, platform: 'firebase', status: result.success ? 'success' : 'error', message: result.message },
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

  const handleQueryGoogle = async () => {
    update(project.id, { googleQuerying: true, googleQuery: null });
    const result = await window.api.queryGoogle(project.id);
    update(project.id, { googleQuerying: false, googleQuery: result });
  };

  const handleQueryApple = async () => {
    update(project.id, { appleQuerying: true, appleQuery: null });
    const result = await window.api.queryApple(project.id);
    update(project.id, { appleQuerying: false, appleQuery: result });
  };

  const isGoogleUploading = state.googleStatus.status === 'uploading';
  const isAppleUploading = state.appleStatus.status === 'uploading';
  const isFirebaseUploading = state.firebaseStatus.status === 'uploading';

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
              <button
                className="btn btn-secondary"
                onClick={handleQueryApple}
                disabled={state.appleQuerying}
              >
                {state.appleQuerying ? '查詢中...' : '查詢版本'}
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
            {state.appleQuery && (
              <BuildTable result={state.appleQuery} platform="apple" />
            )}
            {project.apple?.googleServiceInfoPlistPath && (
              <>
                <div className="subsection-title">Firebase Crashlytics dSYM</div>
                <div className="upload-row">
                  <button className="btn btn-secondary" onClick={handleSelectDsym} disabled={isFirebaseUploading}>
                    選擇 dSYM
                  </button>
                  <div className="file-path-inline">{state.dsymPath || '尚未選擇檔案'}</div>
                  <button
                    className="btn btn-primary"
                    onClick={handleUploadDsym}
                    disabled={!state.dsymPath || isFirebaseUploading}
                  >
                    {isFirebaseUploading ? '上傳中...' : '上傳'}
                  </button>
                </div>
                {state.firebaseStatus.status !== 'idle' && (
                  <div className={`status ${state.firebaseStatus.status}`}>
                    {state.firebaseStatus.status === 'uploading' && (
                      <div className="progress-bar">
                        <div className="progress-bar-fill indeterminate" />
                      </div>
                    )}
                    {state.firebaseStatus.message}
                  </div>
                )}
              </>
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
              <button
                className="btn btn-secondary"
                onClick={handleQueryGoogle}
                disabled={state.googleQuerying}
              >
                {state.googleQuerying ? '查詢中...' : '查詢版本'}
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
            {state.googleQuery && (
              <BuildTable result={state.googleQuery} platform="google" />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function BuildTable({ result, platform }: { result: QueryResult; platform: 'apple' | 'google' }) {
  if (!result.success) {
    return <div className="status error">{result.message}</div>;
  }

  if (result.builds.length === 0) {
    return <div className="status success">{result.message}</div>;
  }

  return (
    <div className="build-table-wrapper">
      <table className="build-table">
        <thead>
          <tr>
            <th>版本</th>
            <th>{platform === 'apple' ? 'Build' : 'Version Code'}</th>
            <th>狀態</th>
            {platform === 'apple' && <th>上傳時間</th>}
          </tr>
        </thead>
        <tbody>
          {result.builds.map((b, i) => (
            <tr key={i}>
              <td>{b.version}</td>
              <td>{b.buildNumber}</td>
              <td>{b.status}</td>
              {platform === 'apple' && <td>{formatDate(b.updatedAt)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
