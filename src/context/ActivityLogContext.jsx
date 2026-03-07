import React, { createContext, useState, useContext, useCallback } from 'react';

const ActivityLogContext = createContext();

export const useActivityLog = () => {
    const ctx = useContext(ActivityLogContext);
    if (!ctx) throw new Error('useActivityLog must be used within ActivityLogProvider');
    return ctx;
};

export const ActivityLogProvider = ({ children }) => {
    const [logEntries, setLogEntries] = useState([]);
    const [lastReadTimestamp, setLastReadTimestamp] = useState(null);

    /**
     * Add a new log entry.
     * @param {'created'|'edited'|'deleted'} action
     * @param {object} booking  — snapshot of the booking at time of action
     * @param {string} performedBy — name of the user
     * @param {string} performedByRole — 'org' | 'admin'
     * @param {object|null} changes — for edits: { field: { old, new } }
     */
    const addLogEntry = useCallback((action, booking, performedBy, performedByRole, changes = null) => {
        const entry = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            action,
            timestamp: new Date().toISOString(),
            performedBy: performedBy || 'Unknown',
            performedByRole: performedByRole || 'unknown',
            booking: { ...booking },
            changes,
        };
        setLogEntries(prev => [entry, ...prev]);
    }, []);

    // Count unread entries (entries after lastReadTimestamp)
    const unreadCount = lastReadTimestamp
        ? logEntries.filter(e => e.timestamp > lastReadTimestamp).length
        : logEntries.length;

    const markAllRead = useCallback(() => {
        setLastReadTimestamp(new Date().toISOString());
    }, []);

    // Export filtered entries as CSV
    const exportCSV = useCallback((entries) => {
        if (!entries || entries.length === 0) return;

        const headers = ['Timestamp', 'Action', 'Performed By', 'Role', 'Room', 'Organization', 'Event Name', 'Date', 'Time Slot', 'Changes'];
        const rows = entries.map(e => [
            new Date(e.timestamp).toLocaleString(),
            e.action,
            e.performedBy,
            e.performedByRole,
            e.booking?.room_name || e.booking?.roomId || '',
            e.booking?.organization || '',
            e.booking?.eventName || '',
            e.booking?.date || '',
            e.booking?.time_slot || '',
            e.changes ? Object.entries(e.changes).map(([k, v]) => `${k}: ${v.old} → ${v.new}`).join('; ') : '',
        ]);

        const csvContent = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bullspace-activity-log-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }, []);

    return (
        <ActivityLogContext.Provider value={{
            logEntries,
            addLogEntry,
            unreadCount,
            markAllRead,
            exportCSV,
        }}>
            {children}
        </ActivityLogContext.Provider>
    );
};

export default ActivityLogContext;
