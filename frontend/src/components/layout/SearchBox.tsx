import { useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Users, CalendarDays, FileText, UserPlus, Wrench, X } from 'lucide-react';
import api from '../../lib/api';
import { getBookingStatusLabel, getEquipmentStatusLabel, getInvoiceStatusLabel, getLeadStatusLabel } from '../../lib/utils';

interface SearchResults {
  customers: { id: string; fullName: string; phone: string | null; email: string | null }[];
  bookings: { id: string; bookingNumber: string; status: string; total: unknown; customer: { fullName: string } | null }[];
  invoices: { id: string; invoiceNumber: string; status: string; total: unknown; customer: { fullName: string } | null }[];
  leads: { id: string; name: string; phone: string | null; status: string }[];
  equipment: { id: string; name: string; equipmentCode: string; status: string }[];
}

function SearchGroup({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="mb-1">
      <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {title}
      </p>
      <div>{children}</div>
    </div>
  );
}

function SearchRow({ onClick, title, subtitle }: { onClick: () => void; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start transition hover:bg-primary-50/60"
    >
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-slate-800">{title}</span>
        <span className="block truncate text-[11px] text-slate-400">{subtitle}</span>
      </span>
    </button>
  );
}

export default function SearchBox() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/search', { params: { q } });
        setResults(res.data.data);
        setOpen(true);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    navigate(path);
  };

  const total = results
    ? results.customers.length +
      results.bookings.length +
      results.invoices.length +
      results.leads.length +
      results.equipment.length
    : 0;

  return (
    <div className="relative hidden w-64 md:block lg:w-80" ref={ref}>
      <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results && query.trim().length >= 2) setOpen(true);
        }}
        className="input h-10 border-transparent bg-slate-100/80 ps-9 pe-16 shadow-none transition focus:bg-white focus:ring-2 focus:ring-primary-500/20"
        placeholder={t('layout.searchPlaceholder')}
      />

      <div className="absolute end-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
              setOpen(false);
            }}
            className="rounded p-0.5 text-slate-400 transition hover:text-slate-600"
            aria-label="مسح البحث"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-400 shadow-2xs">
            Ctrl K
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute start-0 top-full z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-2">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              {query.length >= 2 ? `لا توجد نتائج لـ "${query}"` : 'ابدأ بكتابة اسم، رقم هاتف، أو رقم فاتورة...'}
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto p-2 divide-y divide-slate-100">
              {results!.customers.length > 0 && (
                <SearchGroup title="العملاء" icon={<Users className="h-3.5 w-3.5 text-primary-600" />}>
                  {results!.customers.map((c) => (
                    <SearchRow
                      key={c.id}
                      onClick={() => go(`/customers/${c.id}`)}
                      title={c.fullName}
                      subtitle={c.phone || c.email || ''}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.bookings.length > 0 && (
                <SearchGroup title="الحجوزات" icon={<CalendarDays className="h-3.5 w-3.5 text-amber-600" />}>
                  {results!.bookings.map((b) => (
                    <SearchRow
                      key={b.id}
                      onClick={() => go(`/bookings/${b.id}`)}
                      title={b.bookingNumber}
                      subtitle={`${b.customer?.fullName ?? ''} · ${getBookingStatusLabel(b.status)}`}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.invoices.length > 0 && (
                <SearchGroup title="الفواتير" icon={<FileText className="h-3.5 w-3.5 text-emerald-600" />}>
                  {results!.invoices.map((inv) => (
                    <SearchRow
                      key={inv.id}
                      onClick={() => go(`/invoices/${inv.id}`)}
                      title={inv.invoiceNumber}
                      subtitle={`${inv.customer?.fullName ?? ''} · ${getInvoiceStatusLabel(inv.status)}`}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.leads.length > 0 && (
                <SearchGroup title="العملاء المحتملون" icon={<UserPlus className="h-3.5 w-3.5 text-orange-600" />}>
                  {results!.leads.map((l) => (
                    <SearchRow
                      key={l.id}
                      onClick={() => go('/leads')}
                      title={l.name}
                      subtitle={`${l.phone ?? ''} · ${getLeadStatusLabel(l.status)}`}
                    />
                  ))}
                </SearchGroup>
              )}
              {results!.equipment.length > 0 && (
                <SearchGroup title="المعدات" icon={<Wrench className="h-3.5 w-3.5 text-slate-600" />}>
                  {results!.equipment.map((eq) => (
                    <SearchRow
                      key={eq.id}
                      onClick={() => go('/equipment')}
                      title={eq.name}
                      subtitle={eq.equipmentCode}
                    />
                  ))}
                </SearchGroup>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
