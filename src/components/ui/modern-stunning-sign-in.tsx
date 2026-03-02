"use client"

import * as React from "react"
import { GraduationCap, Users, ShieldCheck, ArrowLeft } from "lucide-react";
import usfLogo from "./usfLogo.png";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLES = [
    {
        id: 'student',
        label: 'Student Sign In',
        description: 'Reserve library study rooms',
        icon: GraduationCap,
        gradient: 'from-blue-500/20 to-blue-600/10',
        ring: 'ring-blue-400/40',
        iconColor: 'text-blue-400',
    },
    {
        id: 'org',
        label: 'Student Organization',
        description: 'Book event spaces across campus',
        icon: Users,
        gradient: 'from-emerald-500/20 to-emerald-600/10',
        ring: 'ring-emerald-400/40',
        iconColor: 'text-emerald-400',
    },
    {
        id: 'admin',
        label: 'Administrator',
        description: 'USF IT — manage all reservations',
        icon: ShieldCheck,
        gradient: 'from-purple-500/20 to-purple-600/10',
        ring: 'ring-purple-400/40',
        iconColor: 'text-purple-400',
    },
];

const SignIn1 = () => {
    const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
    const [netId, setNetId] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [orgName, setOrgName] = React.useState("");
    const [error, setError] = React.useState("");
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSignIn = () => {
        if (!netId || !password) {
            setError("Please enter both NetID and password.");
            return;
        }
        if (selectedRole === 'org' && !orgName.trim()) {
            setError("Please enter your organization name.");
            return;
        }
        setError("");

        if (selectedRole === 'admin') {
            login({ role: 'admin', name: 'System Administrator' });
            navigate('/');
        } else if (selectedRole === 'org') {
            login({ role: 'org', name: orgName.trim() });
            navigate('/');
        } else {
            login({ role: 'student', name: netId });
            navigate('/library');
        }
    };

    const handleBack = () => {
        setSelectedRole(null);
        setError("");
        setNetId("");
        setPassword("");
        setOrgName("");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] relative overflow-hidden w-full">
            {/* Centered glass card */}
            <div className="relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-r from-[#ffffff10] to-[#121212] backdrop-blur-sm shadow-2xl p-8 flex flex-col items-center">
                {/* Logo */}
                <div className="flex items-center justify-center">
                    <img src={usfLogo} alt="USF Logo" className="w-30 h-30 object-contain" />
                </div>
                {/* Title */}
                <h2 className="text-2xl font-semibold text-white mb-1 text-center">
                    BullSpace
                </h2>
                <p className="text-gray-400 text-xs mb-6 text-center">
                    {selectedRole ? 'Enter your credentials' : 'Choose how you want to sign in'}
                </p>

                {!selectedRole ? (
                    /* ── Role Selector ── */
                    <div className="flex flex-col w-full gap-3">
                        {ROLES.map((role) => {
                            const Icon = role.icon;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => setSelectedRole(role.id)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r ${role.gradient} ring-1 ${role.ring} text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10">
                                        <Icon className={`w-5 h-5 ${role.iconColor}`} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-white">{role.label}</h3>
                                        <p className="text-xs text-gray-400">{role.description}</p>
                                    </div>
                                </button>
                            );
                        })}

                        <hr className="opacity-10 my-2" />

                        {/* Microsoft SSO */}
                        <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-b from-[#232526] to-[#2d2e30] rounded-full px-5 py-3 font-medium text-white shadow hover:brightness-110 transition text-sm">
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                                alt="Microsoft"
                                className="w-5 h-5"
                            />
                            Continue with Microsoft
                        </button>
                    </div>
                ) : (
                    /* ── Credential Form ── */
                    <div className="flex flex-col w-full gap-4">
                        <button
                            onClick={handleBack}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors mb-1 self-start"
                        >
                            <ArrowLeft className="w-3 h-3" /> Back to options
                        </button>

                        {/* Role badge */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/10 mb-1">
                            {(() => {
                                const role = ROLES.find(r => r.id === selectedRole);
                                const Icon = role!.icon;
                                return (
                                    <>
                                        <Icon className={`w-4 h-4 ${role!.iconColor}`} />
                                        <span className="text-xs text-white font-medium">{role!.label}</span>
                                    </>
                                );
                            })()}
                        </div>

                        {selectedRole === 'org' && (
                            <input
                                placeholder="Organization Name"
                                type="text"
                                value={orgName}
                                className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                onChange={(e) => setOrgName(e.target.value)}
                            />
                        )}

                        <input
                            placeholder="NetID"
                            type="text"
                            value={netId}
                            className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            onChange={(e) => setNetId(e.target.value)}
                        />
                        <input
                            placeholder="Password"
                            type="password"
                            value={password}
                            className="w-full px-5 py-3 rounded-xl bg-white/10 text-white placeholder-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                            onChange={(e) => setPassword(e.target.value)}
                        />

                        {error && (
                            <div className="text-sm text-red-400 text-left">{error}</div>
                        )}

                        <button
                            onClick={handleSignIn}
                            className="w-full bg-white/10 text-white font-medium px-5 py-3 rounded-full shadow hover:bg-white/20 transition text-sm mt-1"
                        >
                            Sign in
                        </button>
                    </div>
                )}
            </div>

            {/* Tagline */}
            <div className="relative z-10 mt-10 flex flex-col items-center text-center">
                <p className="text-gray-400 text-sm">
                    The <span className="font-medium text-white">BEST</span> way to reserve a space for all your USF needs!
                </p>
            </div>
        </div>
    );
};

export { SignIn1 };
