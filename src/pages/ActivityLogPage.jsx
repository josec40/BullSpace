import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityLog } from '../context/ActivityLogContext';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft, Download, Search, Clock, Plus, Pencil, Trash2,
    X, MapPin, Calendar, Users, Tag, Filter, Eye
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ACTION_CONFIG = {
    created: { label: 'Created', color: 'emerald', icon: Plus },
    edited: { label: 'Edited', color: 'blue', icon: Pencil },
    deleted: { label: 'Deleted', color: 'rose', icon: Trash2 },
};

const ActivityLogPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { logEntries, markAllRead, exportCSV } = useActivityLog();

    const [filterAction, setFilterAction] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Mark all as read when the page loads
    useEffect(() => { markAllRead(); }, [markAllRead]);

    // Filtered entries
    const filteredEntries = useMemo(() => {
        return logEntries.filter(e => {
            // Action filter
            if (filterAction !== 'all' && e.action !== filterAction) return false;
            // Date range filter
            if (dateFrom && e.timestamp < new Date(dateFrom).toISOString()) return false;
            if (dateTo) {
                const toEnd = new Date(dateTo);
                toEnd.setDate(toEnd.getDate() + 1);
                if (e.timestamp >= toEnd.toISOString()) return false;
            }
            // Text search
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const haystack = [
                    e.booking?.organization,
                    e.booking?.eventName,
                    e.booking?.room_name,
                    e.performedBy,
                ].filter(Boolean).join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [logEntries, filterAction, searchQuery, dateFrom, dateTo]);

    const actionFilters = ['all', 'created', 'edited', 'deleted'];

    if (currentUser?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500 text-lg">Access restricted to administrators.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-emerald-600 shadow-lg sticky top-0 z-30">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-white/80 hover:text-white transition p-1"
                        >
                            <ArrowLeft size={22} />
                        </button>
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 font-bold text-xl shadow-lg">
                                B
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white tracking-tight leading-none">Activity Log</h1>
                                <p className="text-xs text-emerald-50 font-medium">Event Space Booking History</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => exportCSV(filteredEntries)}
                        disabled={filteredEntries.length === 0}
                        className="bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center gap-2 border border-white/30"
                    >
                        <Download size={16} />
                        Export CSV
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Action filter pills */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            {actionFilters.map(a => {
                                const isActive = filterAction === a;
                                const cfg = a !== 'all' ? ACTION_CONFIG[a] : null;
                                return (
                                    <button
                                        key={a}
                                        onClick={() => setFilterAction(a)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${isActive
                                                ? a === 'all'
                                                    ? 'bg-white text-slate-800 shadow-sm'
                                                    : `bg-${cfg.color}-500 text-white shadow-sm`
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                        style={isActive && a !== 'all' ? { backgroundColor: `var(--color-${cfg.color})` } : undefined}
                                    >
                                        {a === 'all' ? 'All' : cfg.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="text"
                                placeholder="Search by org, event, or room..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                            />
                        </div>

                        {/* Date range */}
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar size={14} className="text-slate-400" />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            />
                            <span className="text-slate-400">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                            />
                        </div>

                        {/* Clear filters */}
                        {(filterAction !== 'all' || searchQuery || dateFrom || dateTo) && (
                            <button
                                onClick={() => { setFilterAction('all'); setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
                                className="text-xs text-slate-400 hover:text-slate-600 transition flex items-center gap-1"
                            >
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-slate-400 mt-3">
                        {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}{filterAction !== 'all' || searchQuery || dateFrom || dateTo ? ' (filtered)' : ''}
                    </p>
                </div>

                {/* Timeline */}
                {filteredEntries.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <Filter size={24} className="text-slate-400" />
                        </div>
                        <p className="text-slate-500 text-lg font-medium">No activity recorded yet</p>
                        <p className="text-slate-400 text-sm mt-1">Booking changes will appear here as they happen.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredEntries.map((entry) => {
                            const cfg = ACTION_CONFIG[entry.action];
                            const Icon = cfg.icon;
                            const colorMap = {
                                emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', badge: 'bg-emerald-500', border: 'border-emerald-200', hover: 'hover:border-emerald-300' },
                                blue: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-500', border: 'border-blue-200', hover: 'hover:border-blue-300' },
                                rose: { bg: 'bg-rose-100', text: 'text-rose-700', badge: 'bg-rose-500', border: 'border-rose-200', hover: 'hover:border-rose-300' },
                            };
                            const c = colorMap[cfg.color];

                            return (
                                <div
                                    key={entry.id}
                                    className={`bg-white rounded-xl shadow-sm border ${c.border} ${c.hover} p-4 cursor-pointer transition-all hover:shadow-md group`}
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                                            <Icon size={18} className={c.text} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`${c.badge} text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full`}>
                                                    {cfg.label}
                                                </span>
                                                <span className="text-sm font-bold text-slate-800 truncate">
                                                    {entry.booking?.room_name || entry.booking?.roomId || 'Unknown Room'}
                                                </span>
                                                {entry.booking?.organization && (
                                                    <span className="text-sm text-slate-500">— {entry.booking.organization}</span>
                                                )}
                                            </div>

                                            {/* Summary */}
                                            <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={11} />
                                                    {entry.booking?.date || '—'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={11} />
                                                    {entry.booking?.time_slot || '—'}
                                                </span>
                                                {entry.booking?.eventName && (
                                                    <span className="flex items-center gap-1">
                                                        <Tag size={11} />
                                                        {entry.booking.eventName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Edit diffs */}
                                            {entry.changes && (
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {Object.entries(entry.changes).map(([field, { old: oldVal, new: newVal }]) => (
                                                        <span key={field} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                                                            <span className="font-medium capitalize">{field}:</span> {oldVal || '—'} → {newVal || '—'}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Right side */}
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-[11px] text-slate-400" title={new Date(entry.timestamp).toLocaleString()}>
                                                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                by <span className="font-medium text-slate-500">{entry.performedBy}</span>
                                            </span>
                                            <Eye size={14} className="text-slate-300 group-hover:text-emerald-500 transition mt-1" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        {(() => {
                            const cfg = ACTION_CONFIG[selectedEntry.action];
                            const headerColors = { emerald: 'bg-emerald-600', blue: 'bg-blue-600', rose: 'bg-rose-600' };
                            return (
                                <div className={`${headerColors[cfg.color]} px-6 py-5 flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <cfg.icon size={20} className="text-white/80" />
                                        <h3 className="text-xl font-bold text-white">Booking {cfg.label}</h3>
                                    </div>
                                    <button onClick={() => setSelectedEntry(null)} className="text-white/80 hover:text-white transition">
                                        <X size={22} />
                                    </button>
                                </div>
                            );
                        })()}

                        <div className="p-6 space-y-5">
                            {/* Event Name */}
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Event Name</p>
                                <p className="text-lg font-bold text-slate-800">{selectedEntry.booking?.eventName || 'Untitled Event'}</p>
                            </div>

                            {/* Org & Room */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Tag size={16} className="text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Organization</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEntry.booking?.organization || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin size={16} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Room</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEntry.booking?.room_name || '—'}</p>
                                        <p className="text-xs text-slate-400">{selectedEntry.booking?.building || ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date, Time, Attendance */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Calendar size={16} className="text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Date</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEntry.booking?.date || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Clock size={16} className="text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Time</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEntry.booking?.time_slot || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Users size={16} className="text-teal-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium">Expected Attendance</p>
                                        <p className="text-sm font-bold text-slate-800">{selectedEntry.booking?.groupSize || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Performed By + Timestamp */}
                            <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                                <span className="bg-slate-100 text-slate-600 text-xs px-3 py-1 rounded-full font-medium">
                                    by {selectedEntry.performedBy}
                                </span>
                                <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full font-mono">
                                    {new Date(selectedEntry.timestamp).toLocaleString()}
                                </span>
                            </div>

                            {/* Changes diff for edits */}
                            {selectedEntry.changes && (
                                <div className="pt-3 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Changes Made</p>
                                    <div className="space-y-2">
                                        {Object.entries(selectedEntry.changes).map(([field, { old: oldVal, new: newVal }]) => (
                                            <div key={field} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                                <p className="text-xs font-medium text-blue-600 capitalize mb-1">{field}</p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded line-through text-xs">{oldVal || '—'}</span>
                                                    <span className="text-slate-400">→</span>
                                                    <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium">{newVal || '—'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ActivityLogPage;
