import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Edit, X, Shield, AlertCircle,
} from 'lucide-react';
import api from '../lib/api';
import { formatDateTime, getInitials, getRoleLabel, getSimpleStatusLabel } from '../lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleId: string;
  status: string;
  lastLogin: string | null;
}

export default function Users() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users');
      const items = res.data.data.items || [];
      let roleMap: Record<string, string> = {};
      try {
        const rolesRes = await api.get('/roles');
        (rolesRes.data.data.items || rolesRes.data.data || []).forEach((r: any) => { roleMap[r.id] = r.name; });
      } catch {}
      return items.map((u: any) => ({
        ...u,
        role: roleMap[u.roleId] || u.roleId,
        lastLogin: u.lastLoginAt,
      }));
    },
  });

  const { data: roles = [] } = useQuery<any[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await api.get('/roles');
      return res.data.data.items || res.data.data || [];
    },
  });

  // Only keep 2 practical roles in the UI: Admin (مدير النظام) and Employee (موظف)
  const simplifiedRoles = useMemo(() => {
    const adminRole = roles.find((r) => r.name === 'ADMIN' || r.name === 'SUPER_ADMIN') || roles[0];
    const employeeRole = roles.find((r) => r.name === 'EMPLOYEE' || r.name === 'STAFF') || roles.find((r) => r.id !== adminRole?.id);
    const list = [];
    if (adminRole) list.push({ id: adminRole.id, name: 'ADMIN', label: 'مدير النظام' });
    if (employeeRole && employeeRole.id !== adminRole?.id) list.push({ id: employeeRole.id, name: 'EMPLOYEE', label: 'موظف' });
    return list.length > 0 ? list : roles.map((r) => ({ id: r.id, name: r.name, label: getRoleLabel(r.name) }));
  }, [roles]);

  const openEdit = (u: User) => {
    setEditing(u);
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
    const payload: Record<string, any> = Object.fromEntries(fd);
    if (!payload.password) delete payload.password;
    try {
      if (editing) {
        await api.patch(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', payload);
      }
      setShowModal(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      showToast(editing ? 'تم تحديث بيانات المستخدم بنجاح' : 'تم إنشاء المستخدم بنجاح');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error?.message || err?.message || 'حدث خطأ أثناء حفظ المستخدم');
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
        <h1 className="text-2xl font-bold text-slate-900">{t('nav.users')}</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-5 h-5" />
          {t('common.add')}
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{t('customer.name')}</th>
                <th className="px-4 py-3 text-start font-medium">{t('customer.email')}</th>
                <th className="px-4 py-3 text-start font-medium">الدور</th>
                <th className="px-4 py-3 text-start font-medium">{t('common.status')}</th>
                <th className="px-4 py-3 text-start font-medium">آخر تسجيل دخول</th>
                <th className="px-4 py-3 text-center font-medium">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-5 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : !users?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="table-row-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                          {getInitials(u.name)}
                        </div>
                        <span className="font-medium text-slate-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        {getRoleLabel(u.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={u.status === 'ACTIVE' ? 'badge-success' : 'badge-neutral'}>{getSimpleStatusLabel(u.status)}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {u.lastLogin ? formatDateTime(u.lastLogin) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(u)} className="btn-ghost p-1.5 inline-flex">
                        <Edit className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? t('common.edit') : t('common.add')} User</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="label">{t('customer.name')}</label><input name="name" required defaultValue={editing?.name} className="input" /></div>
              <div><label className="label">{t('customer.email')}</label><input name="email" type="email" required defaultValue={editing?.email} className="input" /></div>
              {!editing && (
                <div><label className="label">{t('auth.password')}</label><input name="password" type="password" required className="input" /></div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">الدور</label>
                  <select name="roleId" defaultValue={editing?.roleId || simplifiedRoles[0]?.id} className="input" required>
                    {simplifiedRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>
                <div><label className="label">{t('common.status')}</label>
                  <select name="status" defaultValue={editing?.status || 'ACTIVE'} className="input">
                    <option value="ACTIVE">نشط</option>
                    <option value="INACTIVE">غير نشط</option>
                  </select>
                </div>
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
