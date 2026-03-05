import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmDeleteModal = ({ booking, onConfirm, onClose, deleting = false }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-rose-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Delete Booking?</h3>
                    <p className="text-sm text-slate-500 mb-1">
                        This will permanently delete the booking for:
                    </p>
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                        {booking.room_name || booking.roomId}
                    </p>
                    <p className="text-xs text-slate-400 mb-6">
                        {booking.date} · {booking.time_slot}
                    </p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onConfirm(booking.id, booking.roomId, booking.date)}
                            disabled={deleting}
                            className={`flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition ${deleting ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
