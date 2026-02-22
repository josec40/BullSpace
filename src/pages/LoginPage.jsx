import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, ShieldCheck, ArrowRight, UserCircle2 } from 'lucide-react';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loginRole, setLoginRole] = useState(null); // 'admin' or 'org'
    const [orgName, setOrgName] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (loginRole === 'admin') {
            login({ role: 'admin', name: 'System Administrator' });
            navigate('/');
        } else if (loginRole === 'org' && orgName.trim()) {
            login({ role: 'org', name: orgName.trim() });
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg">
                        <Building2 className="text-white h-12 w-12" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 tracking-tight">
                    Welcome to BullSpace
                </h2>
                <p className="mt-2 text-center text-sm text-slate-600">
                    The modern event space reservation platform for USF
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl border border-slate-100 sm:px-10">
                    {!loginRole ? (
                        <div className="space-y-4">
                            <p className="text-center text-sm font-medium text-slate-500 mb-6">Select your login type</p>

                            <button
                                onClick={() => setLoginRole('org')}
                                className="w-full flex items-center justify-between px-6 py-4 border-2 border-emerald-100 hover:border-emerald-500 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-100 p-2 rounded-lg group-hover:bg-emerald-200 transition-colors">
                                        <UserCircle2 className="h-6 w-6 text-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold">Student Organization</h3>
                                        <p className="text-xs text-slate-500">Manage your events & bookings</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-emerald-400 group-hover:text-emerald-600 transition-colors" />
                            </button>

                            <button
                                onClick={() => setLoginRole('admin')}
                                className="w-full flex items-center justify-between px-6 py-4 border-2 border-slate-100 hover:border-indigo-500 rounded-xl bg-white hover:bg-indigo-50 text-slate-800 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-slate-100 p-2 rounded-lg group-hover:bg-indigo-200 transition-colors">
                                        <ShieldCheck className="h-6 w-6 text-slate-600 group-hover:text-indigo-600" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-bold">Administrator</h3>
                                        <p className="text-xs text-slate-500">View all spaces & manage system</p>
                                    </div>
                                </div>
                                <ArrowRight className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-6">
                            <button
                                type="button"
                                onClick={() => setLoginRole(null)}
                                className="text-sm font-medium text-emerald-600 hover:text-emerald-500 mb-4 inline-block"
                            >
                                ← Back to options
                            </button>

                            {loginRole === 'org' ? (
                                <div>
                                    <label htmlFor="orgName" className="block text-sm font-medium text-slate-700">
                                        Organization Name
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="orgName"
                                            name="orgName"
                                            type="text"
                                            required
                                            value={orgName}
                                            onChange={(e) => setOrgName(e.target.value)}
                                            className="appearance-none block w-full px-3 py-3 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                                            placeholder="e.g. Society of Women Engineers"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl text-sm mb-6 border border-indigo-100 flex gap-3">
                                    <ShieldCheck className="shrink-0" />
                                    <p>You are logging in as a System Administrator. You will have full visibility of all campus reservations.</p>
                                </div>
                            )}

                            <div>
                                <button
                                    type="submit"
                                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${loginRole === 'org'
                                            ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                                            : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                                        }`}
                                >
                                    Log In{loginRole === 'org' && orgName ? ` as ${orgName}` : ''}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
