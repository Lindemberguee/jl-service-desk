import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, RefreshCw, Settings, ExternalLink, BarChart3,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '@/lib/permissions';
import type { AppRole } from '@/lib/permissions';
import { MeetingAnalytics } from '@/components/calendar/MeetingAnalytics';

interface CalEvent {
  uid: string;
  summary: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  calendarName: string;
  calendarColor: string;
}

interface CalendarConfig {
  id: string;
  name: string;
  ical_url: string;
  color: string;
}

// Simple iCal parser
function parseICal(raw: string, calName: string, calColor: string): CalEvent[] {
  const events: CalEvent[] = [];
  const blocks = raw.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split('END:VEVENT')[0];
    const get = (key: string) => {
      const match = block.match(new RegExp(`^${key}[^:]*:(.+)$`, 'm'));
      return match ? match[1].trim() : '';
    };
    const parseDate = (val: string) => {
      if (!val) return new Date();
      // Handle TZID format: 20260320T090000
      const clean = val.replace(/[TZ]/g, (m) => (m === 'T' ? 'T' : m === 'Z' ? 'Z' : ''));
      if (val.length === 8) return new Date(`${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`);
      const y = val.slice(0, 4), mo = val.slice(4, 6), d = val.slice(6, 8);
      const h = val.slice(9, 11) || '00', mi = val.slice(11, 13) || '00';
      return new Date(`${y}-${mo}-${d}T${h}:${mi}:00`);
    };

    const summary = get('SUMMARY');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const uid = get('UID') || `${i}`;
    const location = get('LOCATION');
    const description = get('DESCRIPTION');

    if (summary && dtstart) {
      events.push({
        uid,
        summary,
        start: parseDate(dtstart),
        end: dtend ? parseDate(dtend) : parseDate(dtstart),
        location: location || undefined,
        description: description?.replace(/\\n/g, '\n') || undefined,
        calendarName: calName,
        calendarColor: calColor,
      });
    }
  }
  return events;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function CalendarPage() {
  const { currentTenantId: tenantId, currentRole } = useAuth();
  const navigate = useNavigate();
  const [calendars, setCalendars] = useState<CalendarConfig[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const canManage = hasPermission(currentRole as AppRole, 'integrations:manage');

  useEffect(() => {
    if (!tenantId) return;
    loadCalendarsAndEvents();
  }, [tenantId]);

  async function loadCalendarsAndEvents() {
    setLoading(true);
    const { data } = await supabase
      .from('tenant_calendar_settings')
      .select('*')
      .eq('tenant_id', tenantId!)
      .eq('is_active', true);

    const cals: CalendarConfig[] = data || [];
    setCalendars(cals);

    if (cals.length === 0) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const allEvents: CalEvent[] = [];
    for (const cal of cals) {
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke('fetch-ical', {
          body: { url: cal.ical_url },
        });
        if (fnError) throw fnError;
        if (fnData?.error) throw new Error(fnData.error);
        const raw = fnData?.data || '';
        allEvents.push(...parseICal(raw, cal.name, cal.color));
      } catch (err) {
        console.warn(`Falha ao carregar calendário "${cal.name}":`, err);
        toast.error(`Erro ao carregar "${cal.name}"`);
      }
    }

    allEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    setEvents(allEvents);
    setLoading(false);
  }

  // Calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const grid = useMemo(() => {
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [firstDay, daysInMonth]);

  const eventsForDay = (day: number) =>
    events.filter((e) => {
      const d = e.start;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });

  const today = new Date();
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const selectedEvents = selectedDate
    ? events.filter((e) => {
        const d = e.start;
        return (
          d.getFullYear() === selectedDate.getFullYear() &&
          d.getMonth() === selectedDate.getMonth() &&
          d.getDate() === selectedDate.getDate()
        );
      })
    : [];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Calendário
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Eventos sincronizados do Microsoft Outlook via iCal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCalendarsAndEvents} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => navigate('/integracoes/calendario')}>
              <Settings className="h-3.5 w-3.5 mr-1" /> Configurar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : calendars.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum calendário configurado.</p>
            {canManage && (
              <Button variant="link" size="sm" className="mt-2" onClick={() => navigate('/integracoes/calendario')}>
                Configurar agora <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={prevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <CardTitle className="text-sm font-semibold">
                  {MONTHS[month]} {year}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {w}
                  </div>
                ))}
              </div>
              {/* Days grid */}
              <div className="grid grid-cols-7 gap-px">
                {grid.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} className="min-h-[70px]" />;
                  const dayEvents = eventsForDay(day);
                  const selected = selectedDate?.getDate() === day && selectedDate?.getMonth() === month && selectedDate?.getFullYear() === year;
                  return (
                    <div
                      key={day}
                      className={`min-h-[70px] p-1 border rounded-md cursor-pointer transition-colors hover:bg-accent/50 ${
                        selected ? 'ring-2 ring-primary bg-accent/30' : ''
                      } ${isToday(day) ? 'bg-primary/5' : ''}`}
                      onClick={() => setSelectedDate(new Date(year, month, day))}
                    >
                      <span
                        className={`text-xs font-medium inline-flex h-5 w-5 items-center justify-center rounded-full ${
                          isToday(day) ? 'bg-primary text-primary-foreground' : ''
                        }`}
                      >
                        {day}
                      </span>
                      <div className="mt-0.5 space-y-0.5">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.uid}
                            className="text-[9px] leading-tight px-1 py-0.5 rounded truncate text-white"
                            style={{ backgroundColor: ev.calendarColor }}
                            title={ev.summary}
                          >
                            {ev.summary}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{dayEvents.length - 2}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t">
                {calendars.map((cal) => (
                  <div key={cal.id} className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cal.color }} />
                    <span className="text-[10px] text-muted-foreground">{cal.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Day Events */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedDate
                  ? `${selectedDate.getDate()} de ${MONTHS[selectedDate.getMonth()]}`
                  : 'Selecione um dia'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Clique em um dia para ver os eventos.
                </p>
              ) : selectedEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  Sem eventos neste dia.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => (
                    <div key={ev.uid} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ev.calendarColor }} />
                        <span className="text-sm font-medium">{ev.summary}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {ev.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {ev.end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <Badge variant="secondary" className="text-[9px]">{ev.calendarName}</Badge>
                      {ev.location && (
                        <p className="text-[10px] text-muted-foreground">📍 {ev.location}</p>
                      )}
                      {ev.description && (
                        <p className="text-[10px] text-muted-foreground line-clamp-3">{ev.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
