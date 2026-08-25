import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, X, Search, DollarSign, Package, AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { formatCurrency, getServiceCategoryLabel, getSimpleStatusLabel } from '../lib/utils';

interface Service {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  status: string;
}

const CATEGORIES = ['تصوير', 'فيديو', 'مونتاج', 'إضاءة', 'صوت', 'طباعة', 'تأجير'];

export default function Services() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['services', search],
    queryFn: async () => {
      const res = await api.get('/services', { params: { search } });
      return res.data.data.items || [];
    },
  });

  const openEdit = (s: Service) => {
    setEditing(s);
    setErrorMsg('');
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd) as Record<string, any>;
    payload.basePrice = parseFloat(payload.basePrice as string) || 0;
    try {
      if (editing) {
        await api.patch(`/services/${editing.id}`, payload);
      } else {
        await api.post('/services', payload);
      }
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['services'] });
      showToast(editing ? 'تم تحديث الخدمة بنجاح' : 'تم إضافة الخدمة بنجاح');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || err?.message || 'حدث خطأ أثناء حفظ الخدمة');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {toastMessage && (
        <div className="fixed top-5 end-5 z-50 flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm font-bold text-primary-900 shadow-xl animate-in slide-in-from-top-4">
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.services')}</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-5 h-5" />
          {t('common.add')}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input ps-10"
          placeholder={t('common.search')}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-48 animate-pulse" />
          ))}
        </div>
      ) : !services?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
          <p>{t('common.noData')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s) => (
            <div key={s.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary-600" />
                </div>
                <span className={s.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}>{getSimpleStatusLabel(s.status)}</span>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{s.name}</h3>
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{s.description}</p>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div>
                  <span className="badge-neutral">{getServiceCategoryLabel(s.category)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">{formatCurrency(s.basePrice)}</span>
                </div>
              </div>
              <button onClick={() => openEdit(s)} className="btn-ghost w-full mt-3 text-sm">
                <Edit className="w-4 h-4" />
                {t('common.edit')}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? t('common.edit') : t('common.add')} {t('common.service')}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">{t('customer.name')}</label><input name="name" required defaultValue={editing?.name} className="input" /></div>
              <div><label className="label">{t('common.service')} Description</label><textarea name="description" defaultValue={editing?.description} className="input" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">الفئة</label>
                  <select name="category" defaultValue={editing?.category || ''} className="input">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">{t('common.amount')}</label><input name="basePrice" type="number" step="0.01" required defaultValue={editing?.basePrice} className="input" /></div>
              </div>
              <div><label className="label">{t('common.status')}</label>
                <select name="status" defaultValue={editing?.status || 'ACTIVE'} className="input">
                  <option value="ACTIVE">نشط</option>
                  <option value="INACTIVE">غير نشط</option>
                </select>
              </div>
              {errorMsg && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {errorMsg}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">{t('common.cancel')}</button>
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? t('common.loading') : t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
