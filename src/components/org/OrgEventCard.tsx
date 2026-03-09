import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reservation, Room } from "@/lib/mockData";
import { formatTime } from "@/lib/mockData";
import { MapPin, Users, Clock, X, Pencil } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface OrgEventCardProps {
  reservation: Reservation;
  room: Room;
  onCancel: (id: string) => void;
  onEdit?: (id: string) => void;
}

export default function OrgEventCard({ reservation, room, onCancel, onEdit }: OrgEventCardProps) {
  const isPast = new Date(`${reservation.date}T${reservation.endTime}`) < new Date();
  const isCancelled = reservation.status === 'cancelled';
  
  return (
    <Card className={`overflow-hidden ${isCancelled ? "opacity-60" : ""}`}>
      {/* Room Image Banner */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={room.imageUrl}
          alt={`${room.name} - ${room.type}`}
          className="w-full h-full object-cover"
        />
        <Badge 
          className={`absolute top-3 right-3 ${
            isCancelled 
              ? 'bg-destructive/90 text-destructive-foreground' 
              : 'bg-primary/90 text-primary-foreground'
          }`}
        >
          {isCancelled ? "Cancelled" : "Booked"}
        </Badge>
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{reservation.title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {new Date(reservation.date + 'T12:00:00').toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{room.name} - {room.building}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{formatTime(reservation.startTime)} - {formatTime(reservation.endTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{reservation.groupSize} attendees</span>
          </div>
        </div>
        
        {!isCancelled && !isPast && (
          <div className="mt-4 flex gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(reservation.id)}>
                <Pencil className="w-4 h-4 mr-1" />
                Edit Booking
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex-1">
                  <X className="w-4 h-4 mr-1" />
                  Cancel Booking
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel "{reservation.title}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onCancel(reservation.id)}>
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
