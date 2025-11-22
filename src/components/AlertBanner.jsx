import React, { useState } from 'react';
import { findAvailableRoom } from '../utils/bookingUtils';
import { AlertTriangle, CheckCircle, ArrowRight, X } from 'lucide-react';

const AlertBanner = ({ conflicts, bookings }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState(null);
    const [suggestion, setSuggestion] = useState(null);

    if (!conflicts || conflicts.length === 0) return null;

    const handleResolveClick = (conflict) => {
        setSelectedConflict(conflict);
        const result = findAvailableRoom(bookings, conflict.booking1.time_slot, conflict.room_name);
        setSuggestion(result);
        setShowModal(true);
    };

    return (
        <>
            <div className="bg-rose-50 border-l-4 border-rose-500 p-4 mb-8 rounded-r-lg shadow-sm">
                <div className="flex items-start justify-between">
                    <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-rose-500 mt-0.5 mr-3" />
                        <div>
                            <h3 className="text-rose-800 font-bold text-lg">
                                {conflicts.length} Scheduling Conflict{conflicts.length > 1 ? 's' : ''} Detected
                            </h3>
                            <div className="mt-2 space-y-2">
                                {conflicts.map((conflict, index) => (
                                    <div key={index} className="text-rose-700 text-sm flex items-center gap-2">
                                        <span className="font-semibold">{conflict.room_name}:</span>
                                        <span>Double booked at {conflict.booking1.time_slot}</span>
                                        <button
                                            onClick={() => handleResolveClick(conflict)}
                                            className="ml-2 text-xs bg-white border border-rose-200 hover:bg-rose-100 text-rose-600 px-2 py-1 rounded font-medium transition-colors"
                                        >
                                            Resolve
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showModal && selectedConflict && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <CheckCircle className="text-emerald-500" size={24} />
                                Smart Resolution
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-slate-600 mb-6">
                                We analyzed the schedule for <span className="font-bold text-slate-800">{selectedConflict.booking1.time_slot}</span> to find an alternative room.
                            </p>

                            {suggestion ? (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Recommended Alternative</p>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="text-lg font-bold text-emerald-900">{suggestion.room_name}</p>
                                            <p className="text-sm text-emerald-700">{suggestion.building}</p>
                                        </div>
                                        <span className="bg-white text-emerald-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm border border-emerald-100">
                                            Available
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-center">
                                    <p className="text-slate-500 font-medium">No alternative rooms found for this time slot.</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                {suggestion && (
                                    <button
                                        onClick={() => {
                                            // In a real app, this would update the booking
                                            setShowModal(false);
                                            alert(`Moved booking to ${suggestion.room_name}`);
                                        }}
                                        className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                                    >
                                        Confirm Move
                                        <ArrowRight size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AlertBanner;
