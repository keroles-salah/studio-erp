import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight, ChevronLeft, Calendar as CalIcon,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate, getEventTypeLabel, toLocalDateString } from '../lib/utils';
import { LARGE_PAGE_SIZE } from '../lib/constants';

interface CalendarEvent {
  id: string;
  bookingId: string;
  customerName: string;
  eventType: string;
  venue: string;
  eventDate: string;
  status: string;
}

const WEEK_DAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const WEEK_DAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Calendar() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const weekDays = isAr ? WEEK_DAYS_AR : WEEK_DAYS_EN;
  const months = isAr ? MONTHS_AR : MONTHS_EN;

  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { data: events, isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar-events', year, month],
    queryFn: async () => {
      const startDate = toLocalDateString(new Date(year, month, 1));
      const endDate = toLocalDateString(new Date(year, month + 1, 0));
      const res = await api.get('/bookings', { params: { eventDateFrom: startDate, eventDateTo: endDate, limit: LARGE_PAGE_SIZE } });
      // Transform bookings to calendar events
      const bookings = res.data.data.items || [];
      return bookings.map((b: any) => ({
        id: b.id,
        bookingId: b.id,
        customerName: b.customer?.fullName || '-',
        eventType: b.event?.eventType || '-',
        venue: b.event?.venueName || '-',
        eventDate: b.event?.eventDate,
        status: b.status,
      }));
    },
  });

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: { date: Date | null; day: number }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ date: null, day: prevMonthDays - i });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ date: new Date(year, month, d), day: d });
    }
    while (days.length % 7 !== 0) {
      days.push({ date: null, day: 0 });
    }
    return days;
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {};
    events?.forEach((e) => {
      if (!e.eventDate) return;
      const datePart = e.eventDate.split('T')[0];
      const d = parseInt(datePart.split('-')[2], 10);
      if (!Number.isNaN(d)) {
        if (!map[d]) map[d] = [];
        map[d].push(e);
      }
    });
    return map;
  }, [events]);

  const today = new Date();

  const navigateMonth = (delta: number) => {
    setCurrentDate(new Date(year, month + delta, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.calendar')}</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="btn-secondary p-2">
            <ChevronRight className="w-5 h-5 rtl:rotate-180" />
          </button>
          <h2 className="text-lg font-semibold text-slate-700 min-w-[140px] text-center">
            {months[month]} {year}
          </h2>
          <button onClick={() => navigateMonth(1)} className="btn-secondary p-2">
            <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="btn-secondary text-sm">
            {isAr ? 'اليوم' : 'Today'}
          </button>
        </div>
      </div>

      <div className="card p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayObj, idx) => {
            if (!dayObj.date) {
              return <div key={idx} className="min-h-[100px] rounded-lg bg-slate-50/50" />;
            }
            const dayEvents = eventsByDay[dayObj.day] || [];
            const isToday =
              dayObj.date.getDate() === today.getDate() &&
              dayObj.date.getMonth() === today.getMonth() &&
              dayObj.date.getFullYear() === today.getFullYear();

            return (
              <div
                key={idx}
                className={`min-h-[100px] rounded-lg border p-2 ${
                  isToday ? 'border-primary-400 bg-primary-50' : 'border-slate-200 bg-white'
                }`}
              >
                <p className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-700' : 'text-slate-700'}`}>
                  {dayObj.day}
                </p>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <Link
                      key={e.id}
                      to={`/bookings/${e.bookingId}`}
                      className="block text-xs p-1.5 rounded bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors truncate"
                    >
                      <p className="font-medium truncate">{e.customerName}</p>
                      <p className="text-primary-600 truncate">{getEventTypeLabel(e.eventType)}</p>
                    </Link>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-slate-400 text-center">
                      +{dayEvents.length - 3} {isAr ? 'المزيد' : 'more'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isLoading && (
          <div className="mt-4 flex items-center justify-center text-slate-400 text-sm">
            <CalIcon className="w-4 h-4 me-2 animate-pulse" />
            {t('common.loading')}
          </div>
        )}

        {!isLoading && events?.length === 0 && (
          <p className="mt-4 text-center text-slate-400 text-sm">{t('common.noData')}</p>
        )}
      </div>
    </div>
  );
}
