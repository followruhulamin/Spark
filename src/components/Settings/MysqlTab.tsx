import React, { useState } from 'react';
import { confirm as tauriConfirm } from '@tauri-apps/plugin-dialog';
import {
  Database,
  Play,
  Square,
  RotateCw,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { DatabaseInfo, MysqlStatus } from '../../types';

interface MysqlTabProps {
  mysqlStatus: MysqlStatus;
  databases: DatabaseInfo[];
  onStartMysql: () => Promise<string>;
  onStopMysql: () => Promise<string>;
  onRestartMysql: () => Promise<string>;
  onCreateDatabase: (name: string, collation: string) => Promise<string>;
  onDropDatabase: (name: string) => Promise<string>;
  onOpenClient: (dbName?: string) => Promise<string>;
}

export const MysqlTab: React.FC<MysqlTabProps> = ({
  mysqlStatus,
  databases,
  onStartMysql,
  onStopMysql,
  onRestartMysql,
  onCreateDatabase,
  onDropDatabase,
  onOpenClient,
}) => {
  const [newDbName, setNewDbName] = useState('');
  const [collation, setCollation] = useState('utf8mb4_unicode_ci');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateDb = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDbName.trim()) return;

    setActionLoading('create');
    setError(null);
    setMessage(null);

    try {
      const res = await onCreateDatabase(newDbName.trim(), collation);
      setMessage(res);
      setNewDbName('');
    } catch (err: any) {
      setError(err?.toString() || 'Failed to create database');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDropDb = async (name: string) => {
    try {
      const confirmed = await tauriConfirm(
        `Are you sure you want to drop database '${name}'?\nAll tables and data will be permanently deleted.`,
        {
          title: 'Spark',
          kind: 'warning',
          okLabel: 'Drop Database',
          cancelLabel: 'Cancel',
        }
      );
      if (!confirmed) return;
    } catch {
      if (!window.confirm(`Are you sure you want to drop database '${name}'? All tables and data will be permanently deleted.`)) {
        return;
      }
    }

    setActionLoading(`drop-${name}`);
    setError(null);
    setMessage(null);

    try {
      const res = await onDropDatabase(name);
      setMessage(res);
    } catch (err: any) {
      setError(err?.toString() || 'Failed to drop database');
    } finally {
      setActionLoading(null);
    }
  };

  const handleServiceAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(action);
    setError(null);
    setMessage(null);

    try {
      let res = '';
      if (action === 'start') res = await onStartMysql();
      if (action === 'stop') res = await onStopMysql();
      if (action === 'restart') res = await onRestartMysql();
      setMessage(res);
    } catch (err: any) {
      setError(err?.toString() || `Failed to ${action} MySQL`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Service Status & Controls Card */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-xl border ${
                mysqlStatus.running
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}
            >
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-white">MySQL Database Server</h4>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    mysqlStatus.running
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {mysqlStatus.running ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="text-xs text-white/50 font-mono mt-0.5">
                Port: {mysqlStatus.port} • {mysqlStatus.version}
              </div>
            </div>
          </div>

          {/* Controls: Start / Stop / Restart */}
          <div className="flex items-center space-x-2">
            {!mysqlStatus.running ? (
              <button
                onClick={() => handleServiceAction('start')}
                disabled={actionLoading === 'start'}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {actionLoading === 'start' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                <span>Start</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleServiceAction('stop')}
                  disabled={actionLoading === 'stop'}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading === 'stop' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-white" />}
                  <span>Stop</span>
                </button>
                <button
                  onClick={() => handleServiceAction('restart')}
                  disabled={actionLoading === 'restart'}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] transition active:scale-95 disabled:opacity-50"
                >
                  {actionLoading === 'restart' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" /> : <RotateCw className="w-3.5 h-3.5" />}
                  <span>Restart</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="text-[11px] text-white/40 font-mono flex items-center space-x-1.5 border-t border-white/[0.06] pt-2">
          <HardDrive className="w-3.5 h-3.5 text-white/30" />
          <span>Data Dir: {mysqlStatus.data_dir}</span>
        </div>
      </div>

      {/* Quick Credentials Card */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Default Connection Credentials</h4>
          <button
            onClick={() => onOpenClient()}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition active:scale-95"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Open in TablePlus / Sequel Ace</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 font-mono text-xs">
          <div
            onClick={() => copyToClipboard('127.0.0.1', 'host')}
            className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-white/40 uppercase">Host</div>
              <div className="text-white font-semibold">127.0.0.1</div>
            </div>
            {copiedKey === 'host' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
          </div>

          <div
            onClick={() => copyToClipboard('3306', 'port')}
            className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-white/40 uppercase">Port</div>
              <div className="text-white font-semibold">3306</div>
            </div>
            {copiedKey === 'port' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
          </div>

          <div
            onClick={() => copyToClipboard('root', 'user')}
            className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-white/40 uppercase">User</div>
              <div className="text-white font-semibold">root</div>
            </div>
            {copiedKey === 'user' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
          </div>

          <div
            onClick={() => copyToClipboard('', 'pass')}
            className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.06] transition flex items-center justify-between"
          >
            <div>
              <div className="text-[10px] text-white/40 uppercase">Password</div>
              <div className="text-white/60 italic">(empty)</div>
            </div>
            {copiedKey === 'pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/30" />}
          </div>
        </div>
      </div>

      {/* Database Management Panel */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-4">
        <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Local Databases ({databases.length})</h4>

        {/* Create New Database */}
        <form onSubmit={handleCreateDb} className="flex items-center space-x-2">
          <input
            type="text"
            value={newDbName}
            onChange={(e) => setNewDbName(e.target.value)}
            placeholder="New database name (e.g. blog_dev)"
            className="flex-1 bg-white/[0.05] focus:bg-[#16161a] border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white outline-none font-mono"
          />
          <select
            value={collation}
            onChange={(e) => setCollation(e.target.value)}
            className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none font-mono"
          >
            <option value="utf8mb4_unicode_ci">utf8mb4_unicode_ci</option>
            <option value="utf8mb4_general_ci">utf8mb4_general_ci</option>
            <option value="utf8mb4_bin">utf8mb4_bin</option>
          </select>
          <button
            type="submit"
            disabled={actionLoading === 'create' || !newDbName.trim()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {actionLoading === 'create' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            <span>Create</span>
          </button>
        </form>

        {message && <div className="text-xs text-emerald-400 font-mono">{message}</div>}
        {error && <div className="text-xs text-red-400 font-mono">{error}</div>}

        {/* Databases Table */}
        <div className="border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
          <div className="grid grid-cols-12 px-3 py-2 bg-white/[0.04] text-[11px] font-semibold text-white/50 uppercase tracking-wider font-mono">
            <span className="col-span-5">Database Name</span>
            <span className="col-span-2 text-right">Tables</span>
            <span className="col-span-3 text-right">Size</span>
            <span className="col-span-2 text-right">Actions</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {databases.map((db) => (
              <div
                key={db.name}
                className="grid grid-cols-12 px-3 py-2.5 text-xs items-center hover:bg-white/[0.03] transition"
              >
                <div className="col-span-5 flex items-center space-x-2 truncate">
                  <Database className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span
                    onClick={() => onOpenClient(db.name)}
                    className="font-mono text-white/90 hover:text-blue-400 cursor-pointer truncate"
                    title="Click to open in database client"
                  >
                    {db.name}
                  </span>
                </div>
                <span className="col-span-2 text-right font-mono text-white/60">
                  {db.table_count}
                </span>
                <span className="col-span-3 text-right font-mono text-white/60">
                  {db.size_formatted}
                </span>
                <div className="col-span-2 flex items-center justify-end space-x-1">
                  <button
                    onClick={() => onOpenClient(db.name)}
                    title="Open in Database Client"
                    className="p-1 rounded hover:bg-white/[0.08] text-white/40 hover:text-white transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDropDb(db.name)}
                    disabled={actionLoading === `drop-${db.name}`}
                    title="Drop database"
                    className="p-1 rounded hover:bg-red-500/20 text-white/30 hover:text-red-400 transition"
                  >
                    {actionLoading === `drop-${db.name}` ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
