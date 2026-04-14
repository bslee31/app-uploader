import React, { useState, useEffect } from 'react';
import { HistoryEntry } from '../../shared/types';

interface Props {
  onClose: () => void;
}

const platformLabel: Record<string, string> = {
  apple: 'Apple TestFlight',
  google: 'Google Play',
  firebase: 'Firebase dSYM',
};

export default function HistoryPanel({ onClose }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadHistory = async () => {
    const list = await window.api.listHistory();
    setEntries(list);
    setLoaded(true);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClear = async () => {
    await window.api.clearHistory();
    setEntries([]);
  };

  if (!loaded) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header-row">
          <h3>上傳歷史紀錄</h3>
          {entries.length > 0 && (
            <button className="btn btn-secondary" onClick={handleClear}>清除全部</button>
          )}
        </div>

        {entries.length === 0 ? (
          <p style={{ color: '#a0a0a0', fontSize: 13 }}>尚無上傳紀錄</p>
        ) : (
          <div className="build-table-wrapper">
            <table className="build-table">
              <thead>
                <tr>
                  <th>時間</th>
                  <th>專案</th>
                  <th>平台</th>
                  <th>檔案</th>
                  <th>結果</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td>{formatDate(e.timestamp)}</td>
                    <td>{e.projectName}</td>
                    <td>{platformLabel[e.platform] || e.platform}</td>
                    <td className="file-cell">{e.fileName}</td>
                    <td>
                      <span className={`history-badge ${e.success ? 'success' : 'error'}`}>
                        {e.success ? '成功' : '失敗'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>關閉</button>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}
