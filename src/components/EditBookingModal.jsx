import React, { useState, useMemo } from 'react';
import { X, Save, Clock, Calendar, AlertCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const EditBookingModal = ({ booking, rooms = [], onSave, onClose }) => {
    const { currentUser } = useAuth();
    const userRole = currentUser?.role || 'student';

    const [formData, setFormData] = useState({
        date: booking.date || '',
        startTime: booking.startTime || '',
        endTime: booking.endTime || '',
        organization: booking.organization || '',
        groupSize: booking.groupSize || '',
    });
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const room = rooms.find(r => r.id === booking.roomId);

    const timeOptions = useMemo(() => {
        const opts = [];
        for (let i = 7; i <= 22; i++) {
            for (let j = 0; j < 60; j += 30) {
                if (i === 22 && j > 0) continue;
                const hour = i.toString().padStart(2, '0');
                const minute = j.toString().padStart(2, '0');
                const displayHour = i % 12 || 12;
                const ampm = i < 12 ? 'AM' : 'PM';
                opts.push({ value: `${hour}:${minute}`, label: `${displayHour}:${minute} ${ampm}` });
            }
        }
        return opts;
    }, []);

    // Live validation
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 5); // "HH:MM"

    const dateError = formData.date && formData.date < todayStr
        ? 'Cannot select a past date.'
        : null;

    const pastTimeError = !dateError && formData.date === todayStr && formData.startTime && formData.startTime < nowTime
        ? 'Cannot select a time that has already passed today.'
        : null;

    const timeError = formData.startTime && formData.endTime && formData.startTime >= formData.endTime
        ? 'End time must be after start time.'
        : null;

    const validationError = dateError || pastTimeError || timeError;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!formData.date || !formData.startTime || !formData.endTime) {
            setError('Please fill in all required fields.');
            return;
        }

        if (validationError) {
            setError(validationError);
            return;
        }

        setSaving(true);
        try {
            await onSave(booking.id, {
                roomId: booking.roomId,
                date: formData.date,
                startTime: formData.startTime,
                endTime: formData.endTime,
                organization: formData.organization,
                groupSize: formData.groupSize ? Number(formData.groupSize) : undefined,
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to update booking.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in">
                {/* Header */}
                <div className="bg-emerald-600 px-6 py-5 text-white flex items-center justify-between">
                    <h2 className="text-lg font-bold">Edit Booking</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/20 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Error */}
                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Room info (read-only) */}
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Room</p>
                        <p className="text-sm font-bold text-slate-800">{room?.name || booking.roomId}</p>
                        {room?.building && <p className="text-xs text-slate-500">{room.building}</p>}
                    </div>

                    {/* Organization — hidden for students */}
                    {userRole !== 'student' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Organization</label>
                            <input
                                type="text"
                                name="organization"
                                value={formData.organization}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm text-gray-900"
                            />
                        </div>
                    )}

                    {/* Group Size */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Users size={14} className="text-emerald-600" /> Group Size
                        </label>
                        <input
                            type="number"
                            name="groupSize"
                            value={formData.groupSize}
                            onChange={handleChange}
                            min="1"
                            max={room?.capacity || 50}
                            placeholder={room?.capacity ? `Max ${room.capacity}` : 'Enter group size'}
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm text-gray-900"
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                            <Calendar size={14} className="text-emerald-600" /> Date
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm text-gray-900"
                        />
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Clock size={14} className="text-emerald-600" /> Start
                            </label>
                            <select
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm bg-white text-gray-900"
                            >
                                <option value="">Select</option>
                                {timeOptions.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
                                <Clock size={14} className="text-emerald-600" /> End
                            </label>
                            <select
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                required
                                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-sm bg-white text-gray-900"
                            >
                                <option value="">Select</option>
                                {timeOptions.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Live validation warning */}
                    {validationError && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-700 p-2.5 rounded-lg text-xs flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-sm hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !!validationError}
                            className={`flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2 ${(saving || validationError) ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {saving ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBookingModal;
