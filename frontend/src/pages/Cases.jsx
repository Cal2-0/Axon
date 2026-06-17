import React, { useState, useEffect } from 'react';
import { listCases, createCase, getCase, addCaseNote } from '../api/axon';
import { useNavigate } from 'react-router-dom';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [activeCase, setActiveCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const data = await listCases();
      setCases(data);
      if (data.length > 0 && !activeCase) {
        loadCase(data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCase = async (id) => {
    try {
      const data = await getCase(id);
      setActiveCase(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const c = await createCase(newTitle, newDesc);
      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      await fetchCases();
      loadCase(c.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim() || !activeCase) return;
    setNoteLoading(true);
    try {
      await addCaseNote(activeCase.id, newNote);
      setNewNote('');
      await loadCase(activeCase.id);
    } catch (err) {
      console.error(err);
    } finally {
      setNoteLoading(false);
    }
  };

  return (
    <div className="flex h-full animate-fade-in gap-6">
      {/* Left Pane - Case List */}
      <div className="w-1/3 min-w-[300px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-axon-purple"></span>
            Active Cases
          </h2>
          <button onClick={() => setShowNewModal(true)} className="axon-button px-3 py-1.5 text-xs bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white">
            + New Case
          </button>
        </div>

        <div className="glass-panel flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-axon-text-muted font-mono text-sm">Loading cases...</div>
          ) : cases.length === 0 ? (
            <div className="p-6 text-center text-axon-text-muted font-mono text-sm">No active cases.</div>
          ) : (
            <div className="divide-y divide-axon-border/50">
              {cases.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => loadCase(c.id)}
                  className={`p-4 cursor-pointer transition-colors ${activeCase?.id === c.id ? 'bg-axon-purple/10 border-l-2 border-axon-purple' : 'hover:bg-axon-card'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-white text-sm">{c.title}</span>
                    <span className="text-[10px] font-mono text-axon-purple px-1.5 py-0.5 rounded border border-axon-purple/30">ID: {c.id}</span>
                  </div>
                  <div className="text-xs text-axon-text-muted line-clamp-2 mb-2">{c.description || "No description"}</div>
                  <div className="text-[10px] font-mono text-axon-text-dim">
                    {new Date(c.created_at * 1000).toLocaleDateString()} · {c.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane - Case Details */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeCase ? (
          <div className="glass-panel flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-axon-border bg-axon-surface">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-extrabold text-white mb-2">{activeCase.title}</h1>
                  <p className="text-sm text-axon-text-muted">{activeCase.description || "No description provided."}</p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-2.5 py-1 text-xs font-bold font-mono rounded border bg-axon-purple/10 text-axon-purple border-axon-purple/30 uppercase">
                    {activeCase.status}
                  </div>
                  <div className="text-[10px] text-axon-text-dim font-mono mt-2">
                    Created: {new Date(activeCase.created_at * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Linked Entities */}
              <div>
                <h3 className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-4 border-b border-axon-border pb-2">Pinned Entities</h3>
                {activeCase.entities && activeCase.entities.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {activeCase.entities.map(e => (
                      <div key={e.id} className="bg-[#0a0f1a] border border-axon-border rounded-lg p-3">
                        <div className="flex justify-between mb-1">
                          <span className="font-mono text-axon-cyan text-xs truncate max-w-[150px]">{e.entity_address}</span>
                          <span className={`px-1.5 py-[1px] text-[10px] font-bold rounded ${e.risk_score >= 80 ? 'bg-red-500/20 text-red-400' : 'bg-axon-green/20 text-axon-green'}`}>{e.risk_score}/100</span>
                        </div>
                        <div className="text-[10px] text-axon-text-muted capitalize">{e.entity_type} · {e.entity_class}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-axon-text-dim font-mono bg-axon-card p-3 rounded">No entities pinned yet. Use the Bulk Scanner or investigation view to pin.</div>
                )}
              </div>

              {/* Investigator Notes */}
              <div>
                <h3 className="text-sm font-bold text-axon-text-dim uppercase tracking-wider mb-4 border-b border-axon-border pb-2">Investigator Timeline</h3>
                <div className="space-y-4 mb-6">
                  {activeCase.notes && activeCase.notes.length > 0 ? (
                    activeCase.notes.map(n => (
                      <div key={n.id} className="flex gap-4">
                        <div className="w-1.5 rounded-full bg-axon-purple/50 shrink-0"></div>
                        <div className="flex-1 bg-[#0a0f1a] border border-axon-border rounded-lg p-4">
                          <div className="text-xs text-axon-text-dim font-mono mb-2">{new Date(n.created_at * 1000).toLocaleString()}</div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{n.content}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-axon-text-dim font-mono text-center">Timeline is empty.</div>
                  )}
                </div>

                {/* Add Note */}
                <form onSubmit={handleAddNote} className="flex gap-3">
                  <input
                    type="text"
                    value={newNote}
                    onChange={e => setNewNote(e.target.value)}
                    placeholder="Log an observation..."
                    className="flex-1 bg-axon-bg border border-axon-border rounded-lg px-4 py-2 text-sm text-white focus:border-axon-purple outline-none"
                  />
                  <button type="submit" disabled={noteLoading || !newNote.trim()} className="axon-button px-6 bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white">
                    {noteLoading ? "..." : "Add Note"}
                  </button>
                </form>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-axon-text-dim font-mono text-sm border-2 border-dashed border-axon-border rounded-xl">
            Select a case to view details
          </div>
        )}
      </div>

      {/* New Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="glass-panel p-6 w-[400px]">
            <h2 className="text-xl font-bold text-white mb-4">Create New Case</h2>
            <form onSubmit={handleCreateCase} className="space-y-4">
              <div>
                <label className="block text-xs text-axon-text-dim mb-1 uppercase tracking-wider">Case Title</label>
                <input required type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="w-full bg-axon-bg border border-axon-border rounded px-3 py-2 text-white text-sm focus:border-axon-purple outline-none" />
              </div>
              <div>
                <label className="block text-xs text-axon-text-dim mb-1 uppercase tracking-wider">Description (Optional)</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-axon-bg border border-axon-border rounded px-3 py-2 text-white text-sm focus:border-axon-purple outline-none min-h-[80px]" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-axon-text-muted hover:text-white">Cancel</button>
                <button type="submit" className="axon-button bg-axon-purple text-white hover:bg-purple-600 px-4 py-2">Create Case</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
