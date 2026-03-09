import { useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { formatTime, TIME_SLOTS } from "@/lib/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  reservationId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function EditBookingDialog({ reservationId, open, onClose }: Props) {
  const { reservations, rooms, updateReservation } = useAppContext();
  const reservation = reservations.find(r => r.id === reservationId);

  const [date, setDate] = useState<Date | undefined>(reservation ? new Date(reservation.date + 'T12:00:00') : undefined);
  const [startTime, setStartTime] = useState(reservation?.startTime || '10:00');
  const [endTime, setEndTime] = useState(reservation?.endTime || '12:00');
  const [groupSize, setGroupSize] = useState(reservation?.groupSize || 2);

  if (!reservation) return null;
  const room = rooms.find(r => r.id === reservation.roomId);

  const handleSave = () => {
    if (!date) return;
    updateReservation(reservation.id, {
      date: format(date, 'yyyy-MM-dd'),
      startTime,
      endTime,
      groupSize,
    });
    toast.success('Reservation updated!');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Reservation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-3 rounded-md">
            <MapPin className="w-4 h-4" />
            <span className="font-medium text-foreground">{room?.name}</span>
            <span>— {room?.building}</span>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map(t => (
                    <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">End Time</label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.filter(t => t > startTime).map(t => (
                    <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Group Size</label>
            <Input
              type="number"
              min={1}
              max={room?.capacity || 10}
              value={groupSize}
              onChange={e => setGroupSize(parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
