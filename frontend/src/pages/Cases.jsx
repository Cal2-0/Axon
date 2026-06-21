import React, { useState, useEffect } from 'react';
import { listCases, createCase } from '../api/axon';
import { useNavigate } from 'react-router-dom';

export default function Cases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('P2');
  const [newCategory, setNewCategory] = useState('General');
  const [newAssignedTo, setNewAssignedTo] = useState('');
  const [newTags, setNewTags] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, [statusFilter]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const data = await listCases();
      if (statusFilter !== 'All') {
        setCases(data.filter(c => c.status === statusFilter));
      } else {
        setCases(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      const tagsArray = newTags.split(',').map(t => t.trim()).filter(t => t);
      const c = await createCase(newTitle, newDesc, newPriority, newCategory, newAssignedTo, tagsArray);
      setShowNewModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewPriority('P2');
      setNewCategory('General');
      setNewAssignedTo('');
      setNewTags('');
      await fetchCases();
      navigate(`/cases/${c.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-axon-border pb-6 gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 text-xs font-mono font-bold tracking-widest text-axon-purple bg-axon-purple/10 border border-axon-purple/30 rounded-full">
              CASE MANAGEMENT
            </span>
            <div className="flex items-center gap-1 border border-axon-border rounded overflow-hidden">
              {['All', 'Open', 'Active', 'Closed', 'Archived'].map(s => (
                <button 
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-bold transition-colors ${statusFilter === s ? 'bg-axon-purple text-white' : 'bg-axon-surface text-axon-text-dim hover:text-white'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Active Cases</h1>
          <p className="text-axon-text-muted mt-1 text-base max-w-2xl">
            Isolated workspaces for targeted investigations. Case logs, entities, and evidence are automatically siloed within each workspace.
          </p>
        </div>
        <button 
          onClick={() => setShowNewModal(true)} 
          className="axon-button bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white px-8 py-3.5 font-bold uppercase tracking-widest shrink-0"
        >
          + Open New Case
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-axon-text-muted font-mono">Loading cases...</div>
      ) : cases.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="text-xl font-bold text-white mb-2">No Active Cases</h3>
          <p className="text-axon-text-dim max-w-sm mx-auto mb-6">
            Create your first case to start a dedicated investigation workspace with siloed evidence tracking.
          </p>
          <button 
            onClick={() => setShowNewModal(true)} 
            className="axon-button bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white px-6 py-2 text-sm font-bold uppercase tracking-widest"
          >
            Create Case
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map(c => (
            <div 
              key={c.id} 
              onClick={() => navigate(`/cases/${c.id}`)}
              className="glass-panel p-6 cursor-pointer hover:border-axon-purple hover:shadow-[0_0_20px_rgba(167,139,250,0.15)] transition-all group relative overflow-hidden flex flex-col"
            >
              <div className="absolute top-0 left-0 w-1.5 h-full bg-axon-purple opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                    c.status === 'Open' ? 'bg-axon-green/20 text-axon-green border-axon-green/40' : 
                    c.status === 'Active' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                    'bg-axon-text-dim/20 text-axon-text-muted border-axon-border'}`}>
                    {c.status.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                    c.priority === 'P1' ? 'bg-red-500/20 text-red-400 border-red-500/40' : 
                    c.priority === 'P2' ? 'bg-orange-500/20 text-orange-400 border-orange-500/40' :
                    'bg-green-500/20 text-green-400 border-green-500/40'}`}>
                    {c.priority}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-axon-text-dim">{c.case_number || `ID: ${c.id}`}</span>
              </div>
              
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{c.category || 'General'}</div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-axon-purple transition-colors">{c.title}</h3>
              <p className="text-sm text-axon-text-muted line-clamp-2 mb-3 flex-1">
                {c.description || "No description provided."}
              </p>
              
              {c.assigned_to && (
                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-axon-text-dim uppercase tracking-wider font-bold">
                  <span className="w-4 h-4 rounded-full bg-axon-purple/20 flex items-center justify-center text-[8px] text-axon-purple">
                    {c.assigned_to.charAt(0)}
                  </span>
                  {c.assigned_to}
                </div>
              )}
              
              {c.tags && c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {c.tags.slice(0,3).map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider bg-[#1e293b]/50 border border-[#1e293b] text-gray-400 rounded">
                      #{tag}
                    </span>
                  ))}
                  {c.tags.length > 3 && <span className="text-[9px] text-gray-500 self-center">+{c.tags.length-3}</span>}
                </div>
              )}
              
              <div className="flex items-center gap-4 mb-4 text-xs font-mono">
                <div className="flex flex-col">
                  <span className="text-gray-500 uppercase text-[9px]">Entities</span>
                  <span className="text-white">{c.total_entities || 0}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-gray-500 uppercase text-[9px]">Max Risk</span>
                  <span className={c.highest_risk >= 80 ? 'text-red-400' : c.highest_risk >= 60 ? 'text-orange-400' : 'text-white'}>{c.highest_risk || 0}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-axon-border/50 text-xs font-mono text-axon-text-dim">
                <span>{new Date(c.created_at * 1000).toLocaleDateString()}</span>
                <span className="group-hover:text-axon-purple transition-colors flex items-center gap-1">
                  Enter Workspace 
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-[#05080f]/80 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in p-4">
          <div className="bg-axon-surface border border-axon-border rounded-xl p-8 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowNewModal(false)} className="absolute top-4 right-4 text-axon-text-dim hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl font-bold text-white mb-2">Create Investigation Case</h2>
            <p className="text-axon-text-muted text-sm mb-6">Initialize a new isolated workspace for threat tracking.</p>
            
            <form onSubmit={handleCreateCase} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-axon-text-dim mb-1.5 uppercase tracking-wider">Case Code / Title</label>
                <input 
                  required 
                  autoFocus
                  type="text" 
                  value={newTitle} 
                  onChange={e => setNewTitle(e.target.value)} 
                  className="w-full bg-[#05080f] border border-axon-border rounded-lg px-4 py-3 text-white text-sm focus:border-axon-purple outline-none focus:ring-1 focus:ring-axon-purple transition-all" 
                  placeholder="e.g. Operation Silk Road, Lazarus Exploit Q4"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-axon-text-dim mb-1.5 uppercase tracking-wider">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value)}
                    className="w-full bg-[#05080f] border border-axon-border rounded-lg px-4 py-3 text-white text-sm focus:border-axon-purple outline-none focus:ring-1 focus:ring-axon-purple transition-all"
                  >
                    <option value="P1">P1 - Critical</option>
                    <option value="P2">P2 - High</option>
                    <option value="P3">P3 - Routine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-axon-text-dim mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-[#05080f] border border-axon-border rounded-lg px-4 py-3 text-white text-sm focus:border-axon-purple outline-none focus:ring-1 focus:ring-axon-purple transition-all"
                  >
                    {['General', 'Ransomware', 'Rug Pull', 'Pig Butchering', 'Exchange Hack', 'Bridge Exploit', 'Mixer Tracing', 'Sanctions Evasion', 'Money Laundering', 'Asset Recovery'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-axon-text-dim mb-1.5 uppercase tracking-wider">Assign To</label>
                  <input 
                    type="text" 
                    value={newAssignedTo} 
                    onChange={e => setNewAssignedTo(e.target.value)} 
                    className="w-full bg-[#05080f] border border-axon-border rounded-lg px-4 py-3 text-white text-sm focus:border-axon-purple outline-none focus:ring-1 focus:ring-axon-purple transition-all" 
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-axon-text-dim mb-1.5 uppercase tracking-wider">Tags (comma separated)</label>
                  <input 
                    type="text" 
                    value={newTags} 
                    onChange={e => setNewTags(e.target.value)} 
                    className="w-full bg-[#05080f] border border-axon-border rounded-lg px-4 py-3 text-white text-sm focus:border-axon-purple outline-none focus:ring-1 focus:ring-axon-purple transition-all" 
                    placeholder="e.g. lazarus, urgent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-axon-text-dim mb-1.5 uppercase tracking-wider">Brief Description (Optional)</label>
                <textarea 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  className="w-full bg-[#05080f] border border-axon-border rounded-lg px-4 py-3 text-white text-sm focus:border-axon-purple outline-none min-h-[100px] resize-y focus:ring-1 focus:ring-axon-purple transition-all" 
                  placeholder="Initial hypotheses or scope of investigation..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-axon-border/50">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-5 py-2 text-sm text-axon-text-muted hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="axon-button bg-axon-purple/10 border-axon-purple/30 text-axon-purple hover:bg-axon-purple hover:text-white px-6 py-2 text-sm font-bold uppercase tracking-widest transition-all">Initialize Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
