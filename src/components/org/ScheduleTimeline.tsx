import { Reservation, Room, formatTime } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

interface ScheduleTimelineProps {
  reservations: Reservation[];
  rooms: Room[];
  selectedDate: string;
  /** 'admin' shows all filter options; 'org' hides booking-type filter */
  viewRole?: 'admin' | 'org';
}

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function ScheduleTimeline({ reservations, rooms, selectedDate, viewRole = 'org' }: ScheduleTimelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const hours = Array.from({ length: 14 }, (_, i) => i + 8);

  // Unique buildings from rooms
  const buildings = useMemo(() => [...new Set(rooms.map(r => r.building))].sort(), [rooms]);

  // Filter reservations based on filters
  const filteredReservations = useMemo(() => {
    let res = reservations.filter(r => r.status === 'active');

    if (buildingFilter !== 'all') {
      const roomIds = new Set(rooms.filter(r => r.building === buildingFilter).map(r => r.id));
      res = res.filter(r => roomIds.has(r.roomId));
    }

    if (viewRole === 'admin' && typeFilter !== 'all') {
      if (typeFilter === 'student') {
        res = res.filter(r => r.userId.startsWith('student'));
      } else if (typeFilter === 'org') {
        res = res.filter(r => r.userId.startsWith('org'));
      }
    }

    return res;
  }, [reservations, rooms, buildingFilter, typeFilter, viewRole]);

  // Rooms relevant after building filter
  const filteredRooms = useMemo(() => {
    if (buildingFilter === 'all') return rooms;
    return rooms.filter(r => r.building === buildingFilter);
  }, [rooms, buildingFilter]);

  const dayReservations = filteredReservations.filter(r => r.date === selectedDate);

  const timeToPercent = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return ((h - 8) * 60 + m) / (14 * 60) * 100;
  };

  const durationPercent = (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return ((eh * 60 + em) - (sh * 60 + sm)) / (14 * 60) * 100;
  };

  const getEventColor = (res: Reservation) => {
    if (res.userId.startsWith('org')) return 'bg-primary';
    return 'bg-accent';
  };

  const getWeekDates = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    const sunday = new Date(date);
    sunday.setDate(date.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  };

  const getMonthDates = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => {
      const d = new Date(year, month, i + 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  };

  const weekDates = getWeekDates(selectedDate);
  const monthDates = getMonthDates(selectedDate);

  // Aggregate helper for weekly/monthly
  const aggregateDay = (dayRes: Reservation[]) => {
    if (dayRes.length <= 3) return { aggregate: false as const, items: dayRes };
    const studentCount = dayRes.filter(r => r.userId.startsWith('student')).length;
    const orgCount = dayRes.filter(r => r.userId.startsWith('org')).length;
    return { aggregate: true as const, studentCount, orgCount, total: dayRes.length };
  };

  // Rooms that have bookings for swimlane daily view
  const swimlaneRooms = useMemo(() => {
    const roomIds = new Set(dayReservations.map(r => r.roomId));
    return filteredRooms.filter(r => roomIds.has(r.id));
  }, [dayReservations, filteredRooms]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Timeline</CardTitle>
        <p className="text-sm text-muted-foreground">
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
          })}
        </p>
      </CardHeader>
      <CardContent>
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Select value={buildingFilter} onValueChange={setBuildingFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Buildings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Buildings</SelectItem>
              {buildings.map(b => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {viewRole === 'admin' && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Booking Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Booking Types</SelectItem>
                <SelectItem value="student">Individual Student</SelectItem>
                <SelectItem value="org">Organization</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Badge variant="outline" className="ml-auto">
            {filteredReservations.filter(r => r.date === selectedDate).length} event(s) today
          </Badge>
        </div>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
          </TabsList>

          {/* DAILY - RESOURCE SWIMLANE */}
          <TabsContent value="daily">
            <div className="relative">
              {/* Time header row */}
              <div className="flex ml-28 border-b border-border pb-2 mb-2">
                {hours.map((hour) => (
                  <div key={hour} className="flex-1 text-xs text-muted-foreground text-center">
                    {hour % 12 || 12}{hour < 12 ? 'a' : 'p'}
                  </div>
                ))}
              </div>

              {/* Swimlane rows */}
              {swimlaneRooms.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No events scheduled for this day</p>
              ) : (
                <div className="space-y-1">
                  {swimlaneRooms.map(room => {
                    const roomRes = dayReservations.filter(r => r.roomId === room.id);
                    return (
                      <div key={room.id} className="flex items-center gap-0">
                        {/* Room label */}
                        <div className="w-28 flex-shrink-0 pr-2 text-right">
                          <p className="text-xs font-medium text-foreground truncate">{room.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{room.building}</p>
                        </div>
                        {/* Timeline track */}
                        <div className="flex-1 relative h-10 bg-muted/30 rounded">
                          {hours.map((hour, idx) => (
                            <div
                              key={hour}
                              className="absolute top-0 bottom-0 border-l border-border/30"
                              style={{ left: `${(idx / 14) * 100}%` }}
                            />
                          ))}
                          <TooltipProvider>
                            {roomRes.map((res) => {
                              const left = timeToPercent(res.startTime);
                              const width = durationPercent(res.startTime, res.endTime);
                              return (
                                <Tooltip key={res.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`absolute top-1 bottom-1 ${getEventColor(res)} text-primary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium overflow-hidden cursor-pointer hover:opacity-90 transition-opacity`}
                                      style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
                                    >
                                      <div className="truncate">{res.title}</div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      <p className="font-semibold">{res.title}</p>
                                      <p className="text-muted-foreground">{room.name} · {room.building}</p>
                                      <p className="text-muted-foreground">{formatTime(res.startTime)} – {formatTime(res.endTime)}</p>
                                      <p className="text-muted-foreground">{res.groupSize} attendees</p>
                                      <Badge variant="outline" className="mt-1 text-[10px]">
                                        {res.userId.startsWith('org') ? 'Organization' : 'Student'}
                                      </Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </TooltipProvider>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* WEEKLY VIEW */}
          <TabsContent value="weekly">
            <div className="space-y-3">
              {weekDates.map((date) => {
                const dayDate = new Date(date + 'T12:00:00');
                const dayName = dayDate.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = dayDate.getDate();
                const dayRes = filteredReservations.filter(r => r.date === date);
                const agg = aggregateDay(dayRes);

                return (
                  <div key={date} className="flex gap-3 items-start">
                    <div className="w-14 flex-shrink-0 text-center">
                      <div className="text-xs text-muted-foreground">{dayName}</div>
                      <div className={`text-lg font-semibold ${date === selectedDate ? 'text-primary' : 'text-foreground'}`}>
                        {dayNum}
                      </div>
                    </div>
                    <div className="flex-1 min-h-[48px] bg-muted/30 rounded-lg p-2">
                      {dayRes.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">No events</p>
                      ) : agg.aggregate ? (
                        <div className="flex flex-wrap gap-2">
                          {agg.studentCount > 0 && (
                            <Badge variant="secondary">{agg.studentCount} Student Booking{agg.studentCount > 1 ? 's' : ''}</Badge>
                          )}
                          {agg.orgCount > 0 && (
                            <Badge variant="default">{agg.orgCount} Org Event{agg.orgCount > 1 ? 's' : ''}</Badge>
                          )}
                          <Badge variant="outline">{agg.total} total</Badge>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <TooltipProvider>
                            {dayRes.map((res) => {
                              const room = rooms.find(r => r.id === res.roomId);
                              return (
                                <Tooltip key={res.id}>
                                  <TooltipTrigger asChild>
                                    <Badge variant={res.userId.startsWith('org') ? 'default' : 'secondary'} className="cursor-pointer">
                                      {formatTime(res.startTime)} – {res.title}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="text-sm">
                                      <p className="font-semibold">{res.title}</p>
                                      <p className="text-muted-foreground">{room?.name} · {room?.building}</p>
                                      <p className="text-muted-foreground">{formatTime(res.startTime)} – {formatTime(res.endTime)}</p>
                                      <p className="text-muted-foreground">{res.groupSize} attendees</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </TooltipProvider>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* MONTHLY VIEW */}
          <TabsContent value="monthly">
            <div className="grid grid-cols-7 gap-1.5">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {(() => {
                const date = new Date(selectedDate + 'T12:00:00');
                const year = date.getFullYear();
                const month = date.getMonth();
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                const startPadding = firstDay.getDay();
                const daysInMonth = lastDay.getDate();
                const cells = [];

                for (let i = 0; i < startPadding; i++) {
                  cells.push(<div key={`pad-${i}`} className="h-20 bg-muted/10 rounded" />);
                }

                for (let day = 1; day <= daysInMonth; day++) {
                  const d = new Date(year, month, day);
                  const cellDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  const dayRes = filteredReservations.filter(r => r.date === cellDateStr);
                  const isToday = cellDateStr === selectedDate;
                  const agg = aggregateDay(dayRes);

                  cells.push(
                    <div
                      key={day}
                      className={`h-20 border rounded-lg p-1 overflow-hidden ${isToday ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                    >
                      <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {day}
                      </div>
                      {dayRes.length > 0 && (
                        agg.aggregate ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="space-y-0.5 cursor-pointer">
                                  {agg.studentCount > 0 && (
                                    <div className="text-[9px] bg-accent/30 text-accent-foreground rounded px-1 truncate">
                                      {agg.studentCount} student
                                    </div>
                                  )}
                                  {agg.orgCount > 0 && (
                                    <div className="text-[9px] bg-primary/20 text-primary rounded px-1 truncate">
                                      {agg.orgCount} org
                                    </div>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-semibold text-sm">{agg.total} events</p>
                                {agg.studentCount > 0 && <p className="text-xs text-muted-foreground">{agg.studentCount} Student Bookings</p>}
                                {agg.orgCount > 0 && <p className="text-xs text-muted-foreground">{agg.orgCount} Org Events</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-wrap gap-0.5 cursor-pointer">
                                  {dayRes.map((res) => (
                                    <div
                                      key={res.id}
                                      className={`h-1.5 flex-1 min-w-[8px] rounded-full ${getEventColor(res)}`}
                                    />
                                  ))}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm max-w-xs">
                                  <p className="font-semibold mb-1">{dayRes.length} event{dayRes.length > 1 ? 's' : ''}</p>
                                  {dayRes.map(res => (
                                    <p key={res.id} className="text-xs text-muted-foreground">
                                      {formatTime(res.startTime)} – {res.title}
                                    </p>
                                  ))}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      )}
                    </div>
                  );
                }
                return cells;
              })()}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
