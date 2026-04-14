import React, { useState, useEffect } from 'react';
import { AppSettings } from '../../shared/types';

interface Props {
  onClose: () => void;
}

export default function SettingsForm({ onClose }: Props) {
  const [uploadSymbolsPath, setUploadSymbolsPath] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    window.api.getSettings().then((settings: AppSettings) => {
      setUploadSymbolsPath(settings.uploadSymbolsPath || '');
      setLoaded(true);
    });
  }, []);

  const handleSelectUploadSymbols = async () => {
    const path = await window.api.openFile([{ name: 'upload-symbols', extensions: ['*'] }]);
    if (path) setUploadSymbolsPath(path);
  };

  const handleSave = async () => {
    await window.api.updateSettings({ uploadSymbolsPath });
    onClose();
  };

  if (!loaded) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>全域設定</h3>

        <div className="form-group">
          <label>upload-symbols 路徑（Firebase Crashlytics dSYM 上傳）</label>
          <div className="form-row">
            <input value={uploadSymbolsPath} onChange={e => setUploadSymbolsPath(e.target.value)} placeholder="選擇 upload-symbols 執行檔" readOnly />
            <button className="btn btn-secondary" onClick={handleSelectUploadSymbols}>瀏覽</button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={handleSave}>儲存</button>
          <button className="btn btn-secondary" onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
