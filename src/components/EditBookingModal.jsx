import React, { useState, useMemo } from 'react';
import { Save, Clock, Calendar, AlertCircle, Users, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

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
    const nowTime = new Date().toTimeString().slice(0, 5);

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

    const inputClasses = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background rounded-lg shadow-lg w-full max-w-md overflow-hidden border border-border animate-in fade-in-0 zoom-in-95">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border">
                    <h2 className="text-lg font-semibold text-foreground">Edit Booking</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">Update reservation details</p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Error */}
                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Room info (read-only) */}
                    <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium text-foreground">{room?.name || booking.roomId}</span>
                            {room?.building && (
                                <span className="text-muted-foreground">— {room.building}</span>
                            )}
                        </div>
                    </div>

                    {/* Organization — hidden for students */}
                    {userRole !== 'student' && (
                        <div>
                            <Label className="mb-2">Organization</Label>
                            <input
                                type="text"
                                name="organization"
                                value={formData.organization}
                                onChange={handleChange}
                                className={inputClasses}
                            />
                        </div>
                    )}

                    {/* Group Size */}
                    <div>
                        <Label className="mb-2 flex items-center gap-1.5">
                            <Users size={14} className="text-primary" /> Group Size
                        </Label>
                        <input
                            type="number"
                            name="groupSize"
                            value={formData.groupSize}
                            onChange={handleChange}
                            min="1"
                            max={room?.capacity || 50}
                            placeholder={room?.capacity ? `Max ${room.capacity}` : 'Enter group size'}
                            className={inputClasses}
                        />
                    </div>

                    {/* Date */}
                    <div>
                        <Label className="mb-2 flex items-center gap-1.5">
                            <Calendar size={14} className="text-primary" /> Date
                        </Label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className={inputClasses}
                        />
                    </div>

                    {/* Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 flex items-center gap-1.5">
                                <Clock size={14} className="text-primary" /> Start
                            </Label>
                            <select
                                name="startTime"
                                value={formData.startTime}
                                onChange={handleChange}
                                required
                                className={inputClasses}
                            >
                                <option value="">Select</option>
                                {timeOptions.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label className="mb-2 flex items-center gap-1.5">
                                <Clock size={14} className="text-primary" /> End
                            </Label>
                            <select
                                name="endTime"
                                value={formData.endTime}
                                onChange={handleChange}
                                required
                                className={inputClasses}
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
                        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={saving || !!validationError}
                        >
                            {saving ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    <Save size={16} className="mr-1" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBookingModal;
