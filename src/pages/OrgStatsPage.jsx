import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityLog } from '../context/ActivityLogContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart2, TrendingUp, TrendingDown, Users, Calendar, Activity, Search, Filter, ArrowUp, ArrowDown, ArrowUpDown, ArrowDownAZ, ArrowUpZA, ArrowUp01, ArrowDown10 } from 'lucide-react';

const OrgStatsPage = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { logEntries } = useActivityLog();

    // Filtering State
    const [searchQuery, setSearchQuery] = useState('');
    const [filterActivity, setFilterActivity] = useState('all');
    const [filterRetention, setFilterRetention] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Sorting State
    const [sortColumn, setSortColumn] = useState('netBookings');
    const [sortDirection, setSortDirection] = useState('desc');

    if (currentUser?.role !== 'admin') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground text-lg">Access restricted to administrators.</p>
            </div>
        );
    }

    // Process statistics - Step 1: Base Processing with Date Range Filter
    const baseStats = useMemo(() => {
        const orgs = {};

        logEntries.forEach(entry => {
            if (dateFrom && entry.timestamp < new Date(dateFrom).toISOString()) return;
            if (dateTo) {
                const toEnd = new Date(dateTo);
                toEnd.setDate(toEnd.getDate() + 1);
                if (entry.timestamp >= toEnd.toISOString()) return;
            }

            const orgName = entry.booking?.organization;
            if (!orgName) return;

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

        return Object.values(orgs).map(org => ({
            ...org,
            netBookings: org.created - org.cancelled,
            retentionRate: org.created > 0 ? parseFloat(((org.created - org.cancelled) / org.created * 100).toFixed(1)) : 100.0
        }));
    }, [logEntries, dateFrom, dateTo]);

    // Process statistics - Step 2: Search, Status/Retention filtering & Sorting
    const filteredAndSortedStats = useMemo(() => {
        let result = [...baseStats];

        if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();
            result = result.filter(org => org.name.toLowerCase().includes(query));
        }

        if (filterActivity === 'active') {
            result = result.filter(org => org.netBookings >= 1);
        } else if (filterActivity === 'inactive') {
            result = result.filter(org => org.netBookings < 1);
        }

        if (filterRetention === 'above_80') {
            result = result.filter(org => org.retentionRate >= 80);
        } else if (filterRetention === 'above_50') {
            result = result.filter(org => org.retentionRate >= 50);
        } else if (filterRetention === 'below_50') {
            result = result.filter(org => org.retentionRate < 50);
        }

        result.sort((a, b) => {
            let valA = a[sortColumn];
            let valB = b[sortColumn];

            if (sortColumn === 'lastActive') {
                valA = valA ? valA.getTime() : 0;
                valB = valB ? valB.getTime() : 0;
            }

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            return sortDirection === 'asc' ? valA - valB : valB - valA;
        });

        return result;
    }, [baseStats, searchQuery, filterActivity, filterRetention, sortColumn, sortDirection]);

    const totalOrganizations = filteredAndSortedStats.length;
    const allTimeBookings = filteredAndSortedStats.reduce((acc, org) => acc + org.created, 0);
    const allTimeCancellations = filteredAndSortedStats.reduce((acc, org) => acc + org.cancelled, 0);

    const handleSort = (col) => {
        if (sortColumn === col) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(col);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ col, type = 'numeric' }) => {
        const isActive = sortColumn === col;

        if (!isActive) {
            return <ArrowUpDown size={14} className="inline ml-1.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />;
        }

        if (type === 'text') {
            return sortDirection === 'asc'
                ? <ArrowDownAZ size={14} className="inline ml-1.5 text-primary" />
                : <ArrowUpZA size={14} className="inline ml-1.5 text-primary" />;
        } else if (type === 'numeric') {
            return sortDirection === 'asc'
                ? <ArrowUp01 size={14} className="inline ml-1.5 text-primary" />
                : <ArrowDown10 size={14} className="inline ml-1.5 text-primary" />;
        } else if (type === 'date') {
            return sortDirection === 'asc'
                ? <ArrowUp size={14} className="inline ml-1.5 text-primary" />
                : <ArrowDown size={14} className="inline ml-1.5 text-primary" />;
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar
                subtitle="Organization Stats"
                username={currentUser?.name || 'Admin'}
            />

            <main className="container mx-auto px-4 py-8">
                {/* Global Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center text-center pt-6 pb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
                                <Users size={24} />
                            </div>
                            <p className="text-3xl font-bold text-foreground">{totalOrganizations}</p>
                            <p className="text-sm text-muted-foreground font-medium">Student Organizations</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex flex-col items-center justify-center text-center pt-6 pb-6">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
                                <TrendingUp size={24} />
                            </div>
                            <p className="text-3xl font-bold text-foreground">{allTimeBookings}</p>
                            <p className="text-sm text-muted-foreground font-medium">Total Reservations Created</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="flex flex-col items-center justify-center text-center pt-6 pb-6">
                            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-3 text-destructive">
                                <TrendingDown size={24} />
                            </div>
                            <p className="text-3xl font-bold text-foreground">{allTimeCancellations}</p>
                            <p className="text-sm text-muted-foreground font-medium">Total Cancellations</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter and Search Bar */}
                <Card className="mb-6">
                    <CardContent className="pt-5">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 text-muted-foreground pointer-events-none" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by Organization Name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                />
                            </div>

                            {/* Filters container */}
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                                    <Filter size={16} />
                                    Filters:
                                </div>

                                <select
                                    value={filterActivity}
                                    onChange={(e) => setFilterActivity(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active (Net ≥ 1)</option>
                                    <option value="inactive">Inactive (Net &lt; 1)</option>
                                </select>

                                <select
                                    value={filterRetention}
                                    onChange={(e) => setFilterRetention(e.target.value)}
                                    className="px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="all">All Retention (%)</option>
                                    <option value="above_80">≥ 80%</option>
                                    <option value="above_50">≥ 50%</option>
                                    <option value="below_50">&lt; 50%</option>
                                </select>

                                {/* Date range */}
                                <div className="flex items-center gap-2 text-sm ml-2 pl-2 border-l border-border">
                                    <Calendar size={14} className="text-muted-foreground" />
                                    <input
                                        type="date"
                                        title="From Date"
                                        value={dateFrom}
                                        onChange={(e) => setDateFrom(e.target.value)}
                                        className="px-2 py-1.5 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                    <span className="text-muted-foreground">—</span>
                                    <input
                                        type="date"
                                        title="To Date"
                                        value={dateTo}
                                        onChange={(e) => setDateTo(e.target.value)}
                                        className="px-2 py-1.5 rounded-md border border-input bg-background text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Organization Data Table */}
                <Card className="mb-8 overflow-hidden">
                    <CardHeader className="bg-muted/50 border-b border-border">
                        <div className="flex items-center gap-3">
                            <BarChart2 className="text-primary" size={20} />
                            <CardTitle className="text-lg">Usage Breakdown by Organization</CardTitle>
                        </div>
                    </CardHeader>

                    {filteredAndSortedStats.length === 0 ? (
                        <CardContent className="py-16 text-center">
                            <div className="w-16 h-16 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                                <Activity size={24} className="text-muted-foreground" />
                            </div>
                            <p className="text-foreground text-lg font-medium">No results found.</p>
                            <p className="text-muted-foreground text-sm mt-1">Try wiping your search query or loosening the filters.</p>
                        </CardContent>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider select-none">
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('name')}>
                                            Organization Name <SortIcon col="name" type="text" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('totalActions')}>
                                            Total Actions <SortIcon col="totalActions" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('created')}>
                                            Created <SortIcon col="created" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('edited')}>
                                            Edited <SortIcon col="edited" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('cancelled')}>
                                            Cancelled <SortIcon col="cancelled" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('netBookings')}>
                                            Net Bookings <SortIcon col="netBookings" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition whitespace-nowrap group" onClick={() => handleSort('retentionRate')}>
                                            Retention % <SortIcon col="retentionRate" type="numeric" />
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-muted transition text-right whitespace-nowrap group" onClick={() => handleSort('lastActive')}>
                                            Last Activity <SortIcon col="lastActive" type="date" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredAndSortedStats.map((org, i) => (
                                        <tr key={i} className="hover:bg-muted/50 transition-colors">
                                            <td className="px-6 py-4 font-semibold text-foreground">{org.name}</td>
                                            <td className="px-6 py-4 font-mono text-muted-foreground">{org.totalActions}</td>
                                            <td className="px-6 py-4 font-mono text-primary font-medium">{org.created}</td>
                                            <td className="px-6 py-4 font-mono text-blue-600 font-medium">{org.edited}</td>
                                            <td className="px-6 py-4 font-mono text-destructive font-medium">{org.cancelled}</td>
                                            <td className="px-6 py-4 font-semibold text-foreground">{org.netBookings}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary"
                                                            style={{ width: `${Math.max(0, Math.min(100, Math.floor(org.retentionRate)))}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-mono text-muted-foreground">{org.retentionRate}%</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-muted-foreground font-medium flex items-center justify-end gap-1.5">
                                                <Calendar size={13} />
                                                {org.lastActive ? new Date(org.lastActive).toLocaleDateString() : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </main>
        </div>
    );
};

export default OrgStatsPage;
