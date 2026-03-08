import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityLog } from '../context/ActivityLogContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, BarChart2, TrendingUp, TrendingDown, Users, Calendar, Activity, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, ArrowDownAZ, ArrowUpZA, ArrowUp01, ArrowDown10 } from 'lucide-react';

const OrgStatsPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { logEntries } = useActivityLog();

    // Filtering State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActivity, setFilterActivity] = useState('all'); // 'all', 'active', 'inactive'
    const [filterRetention, setFilterRetention] = useState('all'); // 'all', 'above_80', 'above_50', 'below_50'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Sorting State
    const [sortColumn, setSortColumn] = useState('netBookings');
    const [sortDirection, setSortDirection] = useState('desc'); // 'asc' or 'desc'

    if (currentUser?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <p className="text-slate-500 text-lg">Access restricted to administrators.</p>
            </div>
        );
    }

    // Process statistics - Step 1: Base Processing with Date Range Filter
    const baseStats = useMemo(() => {
        const orgs = {};

        logEntries.forEach(entry => {
            // Apply Date Range filter BEFORE processing stats
            if (dateFrom && entry.timestamp < new Date(dateFrom).toISOString()) return;
            if (dateTo) {
                const toEnd = new Date(dateTo);
                toEnd.setDate(toEnd.getDate() + 1); // include the entirely selected day
                if (entry.timestamp >= toEnd.toISOString()) return;
            }

            const orgName = entry.booking?.organization;
            if (!orgName) return; // Skip if no org is associated

            if (!orgs[orgName]) {
                orgs[orgName] = {
                    name: orgName,
                    created: 0,
                    edited: 0,
                    cancelled: 0,
                    totalActions: 0,
                    lastActive: null
                };
            }

            const org = orgs[orgName];
            org.totalActions += 1;

            if (entry.action === 'created') org.created += 1;
            else if (entry.action === 'edited') org.edited += 1;
            else if (entry.action === 'deleted') org.cancelled += 1;

            const entryTime = new Date(entry.timestamp);
            if (!org.lastActive || entryTime > org.lastActive) {
                org.lastActive = entryTime;
            }
        });

        // Convert the object into an array and calculate net bookings and retention
        return Object.values(orgs).map(org => ({
            ...org,
            netBookings: org.created - org.cancelled,
            retentionRate: org.created > 0 ? parseFloat(((org.created - org.cancelled) / org.created * 100).toFixed(1)) : 100.0
        }));
    }, [logEntries, dateFrom, dateTo]);

    // Process statistics - Step 2: Search, Status/Retention filtering & Sorting
    const filteredAndSortedStats = useMemo(() => {
        let result = [...baseStats];

        // 1. Search Filter
        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter(org => org.name.toLowerCase().includes(query));
        }

        // 2. Activity Status Filter
        if (filterActivity === 'active') {
            result = result.filter(org => org.netBookings >= 1);
        } else if (filterActivity === 'inactive') {
            result = result.filter(org => org.netBookings < 1);
        }

        // 3. Retention Filter
        if (filterRetention === 'above_80') {
            result = result.filter(org => org.retentionRate >= 80);
        } else if (filterRetention === 'above_50') {
            result = result.filter(org => org.retentionRate >= 50);
        } else if (filterRetention === 'below_50') {
            result = result.filter(org => org.retentionRate < 50);
        }

        // 4. Interactive Sorting
        result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            // Handle sorting empty dates (lastActive)
            if (sortColumn === 'lastActive') {
                valA = valA ? valA.getTime() : 0;
                valB = valB ? valB.getTime() : 0;
            }

            // String comparison (case insensitive)
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB) 
                    : valB.localeCompare(valA);
            }

            // Numeric comparison
            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [baseStats, searchQuery, filterActivity, filterRetention, sortColumn, sortDirection]);

    // Top Level Aggregations based on *filtered* stats
    const totalOrganizations = filteredAndSortedStats.length;
    const allTimeBookings = filteredAndSortedStats.reduce((acc, org) => acc + org.created, 0);
    const allTimeCancellations = filteredAndSortedStats.reduce((acc, org) => acc + org.cancelled, 0);

    // Helpers
    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('desc'); // default to descending when clicking new column
        }
    };

    const SortIcon = ({ col, type = 'numeric' }) => {
        const isActive = sortColumn === col;

        if (!isActive) {
            return <ArrowUpDown size={14} className="inline ml-1.5 text-slate-300 group-hover:text-slate-400 transition-colors" />;
        }

        if (type === 'text') {
            return sortDirection === 'asc'
                ? <ArrowDownAZ size={14} className="inline ml-1.5 text-emerald-600" />
                : <ArrowUpZA size={14} className="inline ml-1.5 text-emerald-600" />;
        } else if (type === 'numeric') {
            return sortDirection === 'asc'
                ? <ArrowUp01 size={14} className="inline ml-1.5 text-emerald-600" />
                : <ArrowDown10 size={14} className="inline ml-1.5 text-emerald-600" />;
        } else if (type === 'date') {
            return sortDirection === 'asc'
                ? <ArrowUp size={14} className="inline ml-1.5 text-emerald-600" />
                : <ArrowDown size={14} className="inline ml-1.5 text-emerald-600" />;
        }

        return null; // fallback
    };

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
                                <h1 className="text-xl font-bold text-white tracking-tight leading-none">Organization Stats</h1>
                                <p className="text-xs text-emerald-50 font-medium">All-time Usage Analytics</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Global Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3 text-blue-600">
                            <Users size={24} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{totalOrganizations}</p>
                        <p className="text-sm text-slate-500 font-medium">Student Organizations</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3 text-emerald-600">
                            <TrendingUp size={24} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{allTimeBookings}</p>
                        <p className="text-sm text-slate-500 font-medium">Total Reservations Created</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-3 text-rose-600">
                            <TrendingDown size={24} />
                        </div>
                        <p className="text-3xl font-bold text-slate-800">{allTimeCancellations}</p>
                        <p className="text-sm text-slate-500 font-medium">Total Cancellations</p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="text"
                                placeholder="Search by Organization Name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm"
                            />
                        </div>

                        {/* Filters container */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                <Filter size={16} className="text-slate-400" />
                                Filters:
                            </div>

                            <select
                                value={filterActivity}
                                onChange={(e) => setFilterActivity(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-700 bg-white"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active (Net ≥ 1)</option>
                                <option value="inactive">Inactive (Net &lt; 1)</option>
                            </select>

                            <select
                                value={filterRetention}
                                onChange={(e) => setFilterRetention(e.target.value)}
                                className="px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-slate-700 bg-white"
                            >
                                <option value="all">All Retention (%)</option>
                                <option value="above_80">≥ 80%</option>
                                <option value="above_50">≥ 50%</option>
                                <option value="below_50">&lt; 50%</option>
                            </select>

                            {/* Date range */}
                            <div className="flex items-center gap-2 text-sm ml-2 pl-2 border-l border-slate-200">
                                <Calendar size={14} className="text-slate-400" />
                                <input
                                    type="date"
                                    title="From Date"
                                    value={dateFrom}
                                    onChange={(e) => setDateFrom(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                                />
                                <span className="text-slate-400">—</span>
                                <input
                                    type="date"
                                    title="To Date"
                                    value={dateTo}
                                    onChange={(e) => setDateTo(e.target.value)}
                                    className="px-2 py-1.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                        <BarChart2 className="text-emerald-600" size={20} />
                        <h2 className="text-lg font-bold text-slate-800">Usage Breakdown by Organization</h2>
                    </div>

                    {filteredAndSortedStats.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Activity size={24} className="text-slate-400" />
                            </div>
                            <p className="text-slate-500 text-lg font-medium">No results found.</p>
                            <p className="text-slate-400 text-sm mt-1">Try wiping your search query or loosening the filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 text-xs uppercase tracking-wider select-none">
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('name')}>
                                            Organization Name <SortIcon col="name" type="text" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('totalActions')}>
                                            Total Actions <SortIcon col="totalActions" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('created')}>
                                            Created <SortIcon col="created" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('edited')}>
                                            Edited <SortIcon col="edited" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('cancelled')}>
                                            Cancelled <SortIcon col="cancelled" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('netBookings')}>
                                            Net Bookings <SortIcon col="netBookings" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition whitespace-nowrap group" onClick={() => handleSort('retentionRate')}>
                                            Retention % <SortIcon col="retentionRate" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition text-right whitespace-nowrap group" onClick={() => handleSort('lastActive')}>
                                            Last Activity <SortIcon col="lastActive" type="date" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAndSortedStats.map((org, i) => (
                                        <tr key={i} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-800">{org.name}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{org.totalActions}</td>
                                            <td className="px-6 py-4 font-mono text-emerald-600 font-medium">{org.created}</td>
                                            <td className="px-6 py-4 font-mono text-blue-600 font-medium">{org.edited}</td>
                                            <td className="px-6 py-4 font-mono text-rose-600 font-medium">{org.cancelled}</td>
                                            <td className="px-6 py-4 font-bold text-slate-700">{org.netBookings}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500"
                                                            style={{ width: `${Math.max(0, Math.min(100, Math.floor(org.retentionRate)))}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-slate-500">{org.retentionRate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-400 font-medium flex items-center justify-end gap-1.5">
                                                <Calendar size={13} />
                                                {org.lastActive ? new Date(org.lastActive).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default OrgStatsPage;
