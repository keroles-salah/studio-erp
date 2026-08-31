import { prisma } from '../../config/prisma';

export const PAYMENT_METHODS_KEY = 'studio.payment_methods';

export interface PaymentMethod {
  value: string;
  label: string;
  enabled: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { value: 'CASH', label: 'نقداً', enabled: true },
  { value: 'BANK_TRANSFER', label: 'تحويل بنكي', enabled: true },
  { value: 'MADA', label: 'مدى', enabled: true },
  { value: 'CARD', label: 'بطاقة', enabled: true },
  { value: 'STC_PAY', label: 'STC Pay', enabled: true },
  { value: 'APPLE_PAY', label: 'Apple Pay', enabled: true },
  { value: 'ONLINE_PAYMENT', label: 'دفع إلكتروني', enabled: true },
  { value: 'TAMARA', label: 'تمارا', enabled: false },
  { value: 'TABBY', label: 'تابي', enabled: false },
  { value: 'OTHER', label: 'أخرى', enabled: true },
];

export const settingsService = {
  async getSetting(key: string) {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    return setting;
  },

  async setSetting(key: string, value: string, category?: string) {
    return prisma.setting.upsert({
      where: { key },
      update: { value, ...(category ? { category } : {}) },
      create: { key, value, category: category ?? 'general' },
    });
  },

  async getStudioSettings() {
    const settings = await prisma.setting.findMany({
      orderBy: { category: 'asc' },
    });

    const result: Record<string, Record<string, string>> = {};
    for (const s of settings) {
      const cat = s.category || 'general';
      if (!result[cat]) result[cat] = {};
      result[cat][s.key] = s.value;
    }

    return result;
  },

  async listSettings(opts: { page: number; limit: number; category?: string }) {
    const { page, limit, category } = opts;
    const skip = (page - 1) * limit;

    const where = category ? { category } : {};

    const [items, total] = await Promise.all([
      prisma.setting.findMany({
        where,
        skip,
        take: limit,
        orderBy: { key: 'asc' },
      }),
      prisma.setting.count({ where }),
    ]);

    return { items, total, page, limit };
  },

  async updateSettings(
    settings: Array<{ key: string; value: string; category?: string }>,
  ) {
    const operations = settings.map((s) =>
      prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value, ...(s.category ? { category: s.category } : {}) },
        create: { key: s.key, value: s.value, category: s.category ?? 'general' },
      }),
    );

    await prisma.$transaction(operations);
    return settings;
  },

  async getPaymentMethods() {
    const setting = await prisma.setting.findUnique({
      where: { key: PAYMENT_METHODS_KEY },
    });
    if (!setting) return DEFAULT_PAYMENT_METHODS;
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((m: Partial<PaymentMethod>) => ({
          value: String(m.value ?? ''),
          label: String(m.label ?? m.value ?? ''),
          enabled: m.enabled !== false,
        }));
      }
      return DEFAULT_PAYMENT_METHODS;
    } catch {
      return DEFAULT_PAYMENT_METHODS;
    }
  },

  async savePaymentMethods(methods: PaymentMethod[]) {
    await this.setSetting(PAYMENT_METHODS_KEY, JSON.stringify(methods), 'finance');
    return methods;
  },
};
