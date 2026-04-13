import React, { useState, useEffect } from 'react';
import { Project, UploadProgress } from '../../shared/types';

interface Props {
  project: Project;
}

export default function UploadPanel({ project }: Props) {
  const [aabPath, setAabPath] = useState('');
  const [ipaPath, setIpaPath] = useState('');
  const [googleStatus, setGoogleStatus] = useState<UploadProgress>({ platform: 'google', status: 'idle', message: '' });
  const [appleStatus, setAppleStatus] = useState<UploadProgress>({ platform: 'apple', status: 'idle', message: '' });

  useEffect(() => {
    const unsubscribe = window.api.onUploadProgress((progress: UploadProgress) => {
      if (progress.platform === 'google') setGoogleStatus(progress);
      if (progress.platform === 'apple') setAppleStatus(progress);
    });
    return unsubscribe;
  }, []);

  const handleSelectAab = async () => {
    const path = await window.api.openFile([{ name: 'Android App Bundle', extensions: ['aab'] }]);
    if (path) setAabPath(path);
  };

  const handleSelectIpa = async () => {
    const path = await window.api.openFile([{ name: 'iOS App', extensions: ['ipa'] }]);
    if (path) setIpaPath(path);
  };

  const handleUploadGoogle = async () => {
    if (!aabPath) return;
    setGoogleStatus({ platform: 'google', status: 'uploading', message: '準備上傳...' });
    const result = await window.api.uploadGoogle(project.id, aabPath);
    setGoogleStatus({
      platform: 'google',
      status: result.success ? 'success' : 'error',
      message: result.message,
    });
  };

  const handleUploadApple = async () => {
    if (!ipaPath) return;
    setAppleStatus({ platform: 'apple', status: 'uploading', message: '準備上傳...' });
    const result = await window.api.uploadApple(project.id, ipaPath);
    setAppleStatus({
      platform: 'apple',
      status: result.success ? 'success' : 'error',
      message: result.message,
    });
  };

  const isGoogleUploading = googleStatus.status === 'uploading';
  const isAppleUploading = appleStatus.status === 'uploading';

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
              <div className="file-path-inline">{ipaPath || '尚未選擇檔案'}</div>
              <button
                className="btn btn-primary"
                onClick={handleUploadApple}
                disabled={!ipaPath || isAppleUploading}
              >
                {isAppleUploading ? '上傳中...' : '上傳'}
              </button>
            </div>
            {appleStatus.status !== 'idle' && (
              <div className={`status ${appleStatus.status}`}>{appleStatus.message}</div>
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
              <div className="file-path-inline">{aabPath || '尚未選擇檔案'}</div>
              <button
                className="btn btn-primary"
                onClick={handleUploadGoogle}
                disabled={!aabPath || isGoogleUploading}
              >
                {isGoogleUploading ? '上傳中...' : '上傳'}
              </button>
            </div>
            {googleStatus.status !== 'idle' && (
              <div className={`status ${googleStatus.status}`}>{googleStatus.message}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
