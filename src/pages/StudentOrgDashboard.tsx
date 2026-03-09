import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import OrgEventCard from "@/components/org/OrgEventCard";
import ScheduleTimeline from "@/components/org/ScheduleTimeline";
import EditBookingDialog from "@/components/student/EditBookingDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function OrgDashboard() {
  const { reservations, rooms, cancelReservation } = useAppContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [editingId, setEditingId] = useState<string | null>(null);

  const orgName = currentUser?.name || '';
  const orgReservations = reservations.filter(r => r.userId === orgName || r.title === orgName);
  const activeReservations = orgReservations.filter(r => r.status === 'active');
  const upcomingReservations = activeReservations.filter(r =>
    new Date(`${r.date}T${r.endTime}`) >= new Date()
  ).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  const pastAndCancelled = orgReservations.filter(r =>
    r.status === 'cancelled' || new Date(`${r.date}T${r.endTime}`) < new Date()
  ).sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return b.startTime.localeCompare(a.startTime);
  });

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayCount = activeReservations.filter(r => r.date === todayStr).length;
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  return (
    <div className="min-h-screen bg-background">
      <Navbar subtitle="Organization Portal" username={currentUser?.name || 'Organization'} />

      <main className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="text-muted-foreground mt-1">Manage your organization's room bookings</p>
          </div>
          <Button onClick={() => navigate('/search')}>
            <Plus className="h-4 w-4 mr-2" />
            Book a Room
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{upcomingReservations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{orgReservations.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Events</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{todayCount}</p>
            </CardContent>
          </Card>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Schedule Timeline</h3>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <ScheduleTimeline
            reservations={orgReservations}
            rooms={rooms}
            selectedDate={selectedDateStr}
            viewRole="org"
          />
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming ({upcomingReservations.length})</TabsTrigger>
            <TabsTrigger value="past">Past & Cancelled ({pastAndCancelled.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-6">
            {upcomingReservations.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No upcoming events
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingReservations.map(res => {
                  const room = rooms.find(r => r.id === res.roomId);
                  if (!room) return null;
                  return (
                    <OrgEventCard
                      key={res.id}
                      reservation={res}
                      room={room}
                      onCancel={cancelReservation}
                      onEdit={setEditingId}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-6">
            {pastAndCancelled.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  No past or cancelled events
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastAndCancelled.map(res => {
                  const room = rooms.find(r => r.id === res.roomId);
                  if (!room) return null;
                  return (
                    <OrgEventCard
                      key={res.id}
                      reservation={res}
                      room={room}
                      onCancel={cancelReservation}
                    />
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <EditBookingDialog
        reservationId={editingId}
        open={!!editingId}
        onClose={() => setEditingId(null)}
      />
    </div>
  );
}
