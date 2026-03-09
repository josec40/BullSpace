import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityLog } from '../context/ActivityLogContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
            if (filterAction !== 'all' && e.action !== filterAction) return false;
            if (dateFrom && e.timestamp < new Date(dateFrom).toISOString()) return false;
            if (dateTo) {
                const toEnd = new Date(dateTo);
                toEnd.setDate(toEnd.getDate() + 1);
                if (e.timestamp >= toEnd.toISOString()) return false;
            }
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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-lg">Access restricted to administrators.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                subtitle="Activity Log"
                username={currentUser?.name || 'Admin'}
                actions={
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => exportCSV(filteredEntries)}
                        disabled={filteredEntries.length === 0}
                    >
                        <Download className="w-4 h-4 mr-1" /> Export CSV
                    </Button>
                }
            />

            <main className="container mx-auto px-4 py-8">
                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-5">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Action filter pills */}
                            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                                {actionFilters.map(a => {
                                    const isActive = filterAction === a;
                                    const cfg = a !== 'all' ? ACTION_CONFIG[a] : null;
                                    const badgeVariant = a === 'all' ? 'secondary' : a === 'created' ? 'default' : a === 'deleted' ? 'destructive' : 'outline';
                                    return (
                                        <button
                                            key={a}
                                            onClick={() => setFilterAction(a)}
                                            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${isActive
                                                ? a === 'all'
                                                    ? 'bg-background text-foreground shadow-sm'
                                                    : a === 'created'
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : a === 'edited'
                                                            ? 'bg-blue-500 text-white shadow-sm'
                                                            : 'bg-destructive text-destructive-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                                }`}
                                        >
                                            {a === 'all' ? 'All' : cfg.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by org, event, or room..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>

                            {/* Date range */}
                            <div className="flex items-center gap-2 text-sm">
                                <Calendar size={14} className="text-muted-foreground" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                                <span className="text-muted-foreground">to</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>

                            {/* Clear filters */}
                            {(filterAction !== 'all' || searchQuery || dateFrom || dateTo) && (
                                <button
                                    onClick={() => { setFilterAction('all'); setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1"
                                >
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-3">
                            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}{filterAction !== 'all' || searchQuery || dateFrom || dateTo ? ' (filtered)' : ''}
                        </p>
                    </CardContent>
                </Card>

                {/* Timeline */}
                {filteredEntries.length === 0 ? (
                    <Card>
                        <CardContent className="py-16 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Filter size={24} className="text-muted-foreground" />
                            </div>
                            <p className="text-foreground text-lg font-medium">No activity recorded yet</p>
                            <p className="text-muted-foreground text-sm mt-1">Booking changes will appear here as they happen.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {filteredEntries.map((entry) => {
                            const cfg = ACTION_CONFIG[entry.action];
                            const Icon = cfg.icon;
                            const colorMap = {
                                emerald: { bg: 'bg-primary/10', text: 'text-primary', badge: 'bg-primary', border: 'border-primary/20', hover: 'hover:border-primary/30' },
                                blue: { bg: 'bg-blue-100', text: 'text-blue-700', badge: 'bg-blue-500', border: 'border-blue-200', hover: 'hover:border-blue-300' },
                                rose: { bg: 'bg-destructive/10', text: 'text-destructive', badge: 'bg-destructive', border: 'border-destructive/20', hover: 'hover:border-destructive/30' },
                            };
                            const c = colorMap[cfg.color];

                            return (
                                <Card
                                    key={entry.id}
                                    className={`${c.border} ${c.hover} cursor-pointer transition-all hover:shadow-md group`}
                                    onClick={() => setSelectedEntry(entry)}
                                >
                                    <CardContent className="p-4">
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
                                                    <span className="text-sm font-semibold text-foreground truncate">
                                                        {entry.booking?.room_name || entry.booking?.roomId || 'Unknown Room'}
                                                    </span>
                                                    {entry.booking?.organization && (
                                                        <span className="text-sm text-muted-foreground">— {entry.booking.organization}</span>
                                                    )}
                                                </div>

                                                {/* Summary */}
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
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
                                                <span className="text-[11px] text-muted-foreground" title={new Date(entry.timestamp).toLocaleString()}>
                                                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    by <span className="font-medium">{entry.performedBy}</span>
                                                </span>
                                                <Eye size={14} className="text-muted-foreground/50 group-hover:text-primary transition mt-1" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            {selectedEntry && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
                    <div className="bg-background rounded-lg shadow-lg border border-border max-w-lg w-full overflow-hidden animate-in fade-in-0 zoom-in-95" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        {(() => {
                            const cfg = ACTION_CONFIG[selectedEntry.action];
                            return (
                                <div className="px-6 py-4 border-b border-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <cfg.icon size={18} className="text-primary" />
                                            <h3 className="text-lg font-semibold text-foreground">Booking {cfg.label}</h3>
                                        </div>
                                        <button onClick={() => setSelectedEntry(null)} className="text-muted-foreground hover:text-foreground transition p-1 rounded-md hover:bg-muted">
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="p-6 space-y-5">
                            {/* Event Name */}
                            <div className="bg-muted rounded-lg p-4">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Event Name</p>
                                <p className="text-lg font-semibold text-foreground">{selectedEntry.booking?.eventName || 'Untitled Event'}</p>
                            </div>

                            {/* Org & Room */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Tag size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Organization</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEntry.booking?.organization || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin size={16} className="text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Room</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEntry.booking?.room_name || '—'}</p>
                                        <p className="text-xs text-muted-foreground">{selectedEntry.booking?.building || ''}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date, Time, Attendance */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Calendar size={16} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Date</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEntry.booking?.date || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Clock size={16} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Time</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEntry.booking?.time_slot || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Users size={16} className="text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground font-medium">Attendance</p>
                                        <p className="text-sm font-semibold text-foreground">{selectedEntry.booking?.groupSize || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Performed By + Timestamp */}
                            <div className="flex items-center gap-3 pt-3 border-t border-border">
                                <Badge variant="secondary">by {selectedEntry.performedBy}</Badge>
                                <Badge variant="outline" className="font-mono text-xs">
                                    {new Date(selectedEntry.timestamp).toLocaleString()}
                                </Badge>
                            </div>

                            {/* Changes diff for edits */}
                            {selectedEntry.changes && (
                                <div className="pt-3 border-t border-border">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Changes Made</p>
                                    <div className="space-y-2">
                                        {Object.entries(selectedEntry.changes).map(([field, { old: oldVal, new: newVal }]) => (
                                            <div key={field} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                                <p className="text-xs font-medium text-blue-600 capitalize mb-1">{field}</p>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded line-through text-xs">{oldVal || '—'}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">{newVal || '—'}</span>
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
