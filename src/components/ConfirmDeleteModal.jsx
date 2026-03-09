import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConfirmDeleteModal = ({ booking, onConfirm, onClose, deleting = false }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-background rounded-lg shadow-lg w-full max-w-sm overflow-hidden border border-border animate-in fade-in-0 zoom-in-95">
                <div className="p-6 text-center">
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle size={24} className="text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Delete Booking?</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                        This will permanently delete the booking for:
                    </p>
                    <p className="text-sm font-semibold text-foreground mb-1">
                        {booking.room_name || booking.roomId}
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                        {booking.date} · {booking.time_slot}
                    </p>

                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => onConfirm(booking.id, booking.roomId, booking.date)}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeleteModal;
