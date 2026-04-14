import React, { useState } from 'react';
import { Project, GoogleReleaseStatus } from '../../shared/types';

interface Props {
  project: Project | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function ProjectForm({ project, onSubmit, onCancel, onDelete }: Props) {
  const [name, setName] = useState(project?.name || '');
  const [apiKeyId, setApiKeyId] = useState(project?.apple?.apiKeyId || '');
  const [issuerId, setIssuerId] = useState(project?.apple?.issuerId || '');
  const [p8KeyPath, setP8KeyPath] = useState(project?.apple?.p8KeyPath || '');
  const [bundleId, setBundleId] = useState(project?.apple?.bundleId || '');
  const [serviceAccountKeyPath, setServiceAccountKeyPath] = useState(project?.google?.serviceAccountKeyPath || '');
  const [packageName, setPackageName] = useState(project?.google?.packageName || '');
  const [releaseStatus, setReleaseStatus] = useState<GoogleReleaseStatus>(project?.google?.releaseStatus || 'draft');

  const handleSelectP8 = async () => {
    const path = await window.api.openFile([{ name: 'API Key', extensions: ['p8'] }]);
    if (path) setP8KeyPath(path);
  };

  const handleSelectServiceAccount = async () => {
    const path = await window.api.openFile([{ name: 'JSON', extensions: ['json'] }]);
    if (path) setServiceAccountKeyPath(path);
  };

  const appleFields = [apiKeyId, issuerId, p8KeyPath, bundleId];
  const appleSome = appleFields.some(f => f.trim());
  const appleComplete = appleFields.every(f => f.trim());

  const googleFields = [serviceAccountKeyPath, packageName];
  const googleSome = googleFields.some(f => f.trim());
  const googleComplete = googleFields.every(f => f.trim());

  const hasIncomplete = (appleSome && !appleComplete) || (googleSome && !googleComplete);

  const handleSubmit = () => {
    const data: any = { name };

    if (appleComplete) {
      data.apple = { apiKeyId, issuerId, p8KeyPath, bundleId };
    }

    if (googleComplete) {
      data.google = { serviceAccountKeyPath, packageName, releaseStatus };
    }

    onSubmit(data);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{project ? '編輯專案' : '新增專案'}</h3>

        <div className="form-group">
          <label>專案名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="My App" />
        </div>

        <div className="section-title" style={{ marginTop: 20 }}>Apple</div>

        <div className="form-group">
          <label>API Key ID</label>
          <input value={apiKeyId} onChange={e => setApiKeyId(e.target.value)} placeholder="XXXXXXXXXX" />
        </div>

        <div className="form-group">
          <label>Issuer ID</label>
          <input value={issuerId} onChange={e => setIssuerId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
        </div>

        <div className="form-group">
          <label>Bundle ID</label>
          <input value={bundleId} onChange={e => setBundleId(e.target.value)} placeholder="com.example.app" />
        </div>

        <div className="form-group">
          <label>API Key 檔案 (.p8)</label>
          <div className="form-row">
            <input value={p8KeyPath} onChange={e => setP8KeyPath(e.target.value)} placeholder="選擇 .p8 檔案" readOnly />
            <button className="btn btn-secondary" onClick={handleSelectP8}>瀏覽</button>
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 20 }}>Google Play</div>

        <div className="form-group">
          <label>Package Name</label>
          <input value={packageName} onChange={e => setPackageName(e.target.value)} placeholder="com.example.app" />
        </div>

        <div className="form-group">
          <label>發布狀態</label>
          <select value={releaseStatus} onChange={e => setReleaseStatus(e.target.value as GoogleReleaseStatus)}>
            <option value="draft">草稿（尚未發布過的 App）</option>
            <option value="completed">完成（已發布過的 App）</option>
          </select>
        </div>

        <div className="form-group">
          <label>Service Account Key (.json)</label>
          <div className="form-row">
            <input value={serviceAccountKeyPath} onChange={e => setServiceAccountKeyPath(e.target.value)} placeholder="選擇 JSON 檔案" readOnly />
            <button className="btn btn-secondary" onClick={handleSelectServiceAccount}>瀏覽</button>
          </div>
        </div>

        {hasIncomplete && (
          <p style={{ color: '#ff6b6b', fontSize: 13, marginTop: 12 }}>
            {appleSome && !appleComplete && 'Apple 設定不完整，請填寫所有欄位或全部清空。'}
            {googleSome && !googleComplete && 'Google Play 設定不完整，請填寫所有欄位或全部清空。'}
          </p>
        )}

        <div className="modal-actions-split">
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim() || hasIncomplete}>
              {project ? '儲存' : '建立'}
            </button>
            <button className="btn btn-secondary" onClick={onCancel}>取消</button>
          </div>
          {onDelete && (
            <button className="btn btn-danger" onClick={onDelete}>刪除專案</button>
          )}
        </div>
      </div>
    </div>
  );
}
