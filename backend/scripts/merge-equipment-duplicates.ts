/**
 * دمج سجلات المعدات المكررة في نموذج "صنف واحد بكمية"
 * ---------------------------------------------------
 * بعد التحويل إلى نموذج الكمية (Equipment.quantity)، يدمج هذا السكربت السجلات
 * المكررة القديمة (نفس name + category + brand + model) التي كانت تُنشأ كوحدات
 * منفصلة بأكواد متسلسلة (مثال: CAM-005, CAM-005-2, CAM-005-3) إلى سجل واحد
 * تُضاف إليه الكمية = عدد الوحدات المدمجة.
 *
 * ما يفعله لكل مجموعة مكررة (داخل transaction واحدة):
 *   1) إعادة توجيه booking_equipment إلى السجل الكنوني.
 *   2) إعادة توجيه invoice_item.referenceId إلى السجل الكنوني.
 *   3) دمج صفوف booking_equipment المتكررة لنفس (booking, equipment)
 *      في صف واحد بمجموع الكميات والإيرادات والتكاليف.
 *   4) ضبط quantity للسجل الكنوني = عدد الوحدات المدمجة.
 *   5) soft-delete للسجلات المكررة (deletedAt) — تُحذف من القوائم وتُحفظ كأرشفة.
 *
 * التشغيل:
 *   cd backend
 *   DATABASE_URL="<url>" npx ts-node scripts/merge-equipment-duplicates.ts
 *   # لعرض الخطة فقط بدون أي تعديل:
 *   DATABASE_URL="<url>" npx ts-node scripts/merge-equipment-duplicates.ts --dry-run
 */

import { prisma } from '../src/config/prisma';

interface DupGroup {
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  rows: { id: string; equipmentCode: string }[];
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('========================================================');
  console.log(dryRun ? '🔎 فحص دمج المعدات المكررة (بدون تعديل — dry-run)' : '🔄 دمج سجلات المعدات المكررة إلى نموذج الكمية');
  console.log('========================================================\n');

  const all = await prisma.equipment.findMany({
    where: { deletedAt: null },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, name: true, category: true, brand: true, model: true, equipmentCode: true },
  });

  // تجميع حسب (name + category + brand + model)
  const groupMap = new Map<string, DupGroup>();
  for (const e of all) {
    const key = `${e.name}||${e.category}||${e.brand ?? ''}||${e.model ?? ''}`;
    const g = groupMap.get(key) ?? {
      name: e.name,
      category: e.category,
      brand: e.brand,
      model: e.model,
      rows: [],
    };
    g.rows.push({ id: e.id, equipmentCode: e.equipmentCode });
    groupMap.set(key, g);
  }

  const duplicates = [...groupMap.values()].filter((g) => g.rows.length > 1);

  if (duplicates.length === 0) {
    console.log('✅ لا توجد سجلات معدات مكررة — كل شيء سليم.');
    await prisma.$disconnect();
    return;
  }

  let plannedUnits = 0;
  for (const g of duplicates) plannedUnits += g.rows.length;

  console.log(`تم العثور على ${duplicates.length} صنف(أصناف) مكررة بإجمالي ${plannedUnits} سجل.\n`);
  for (const g of duplicates) {
    console.log(
      `  • "${g.name}" (${g.category}): ${g.rows.length} سجلات → ${g.rows.map((r) => r.equipmentCode).join(', ')}`,
    );
  }

  if (dryRun) {
    console.log('\n🏁 وضع الفحص: لم يتم إجراء أي تعديل. أزل --dry-run للتطبيق الفعلي.');
    await prisma.$disconnect();
    return;
  }

  console.log('\nجاري الدمج...\n');
  let mergedItems = 0;
  let softDeletedRows = 0;
  let remappedBookingRows = 0;
  let consolidatedBookingRows = 0;
  let remappedInvoiceItems = 0;

  for (const g of duplicates) {
    await prisma.$transaction(async (tx) => {
      const [canonical, ...others] = g.rows; // الأقدم createdAt أولاً = الكنوني

      // 1) إعادة توجيه حجوزات المعدات
      const bookingRes = await tx.bookingEquipment.updateMany({
        where: { equipmentId: { in: others.map((r) => r.id) } },
        data: { equipmentId: canonical.id },
      });
      remappedBookingRows += bookingRes.count;

      // 2) إعادة توجيه بنود الفواتير
      const invRes = await tx.invoiceItem.updateMany({
        where: { referenceId: { in: others.map((r) => r.id) } },
        data: { referenceId: canonical.id },
      });
      remappedInvoiceItems += invRes.count;

      // 3) دمج صفوف booking_equipment المتكررة لنفس (booking, equipment)
      const beRows = await tx.bookingEquipment.findMany({
        where: { equipmentId: canonical.id },
        orderBy: [{ id: 'asc' }],
      });
      const byBooking = new Map<string, typeof beRows>();
      for (const row of beRows) {
        const arr = byBooking.get(row.bookingId) ?? [];
        arr.push(row);
        byBooking.set(row.bookingId, arr);
      }
      for (const rows of byBooking.values()) {
        if (rows.length <= 1) continue;
        const keep = rows[0];
        const rest = rows.slice(1);
        const qty = rows.reduce((sum, r) => sum + r.quantity, 0);
        const revenue = rows.reduce((sum, r) => sum + Number(r.totalRevenue), 0);
        const cost = rows.reduce((sum, r) => sum + Number(r.totalCost), 0);
        await tx.bookingEquipment.update({
          where: { id: keep.id },
          data: { quantity: qty, totalRevenue: revenue, totalCost: cost },
        });
        await tx.bookingEquipment.deleteMany({
          where: { id: { in: rest.map((r) => r.id) } },
        });
        consolidatedBookingRows += rest.length;
      }

      // 4) كمية السجل الكنوني = عدد الوحدات المدمجة
      await tx.equipment.update({
        where: { id: canonical.id },
        data: { quantity: g.rows.length },
      });

      // 5) soft-delete للمكررات
      await tx.equipment.updateMany({
        where: { id: { in: others.map((r) => r.id) } },
        data: { deletedAt: new Date() },
      });

      mergedItems += 1;
      softDeletedRows += others.length;
    });

    console.log(
      `  ✔ "${g.name}" — أصبحت ${g.rows.length} وحدة على السجل ${g.rows[0].equipmentCode} (تم أرشفة ${g.rows.length - 1} سجلات مكررة)`,
    );
  }

  console.log('\n========================================================');
  console.log('📊 ملخص الدمج:');
  console.log(`   • أصناف تم دمجها: ${mergedItems}`);
  console.log(`   • سجلات مكررة تمت أرشفتها (soft-delete): ${softDeletedRows}`);
  console.log(`   • صفوف حجوزات أُعيد توجيهها: ${remappedBookingRows}`);
  console.log(`   • صفوف حجوزات مكررة تم دمجها: ${consolidatedBookingRows}`);
  console.log(`   • بنود فواتير أُعيد توجيهها: ${remappedInvoiceItems}`);
  console.log('========================================================');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('❌ فشل تنفيذ السكربت:', err);
  await prisma.$disconnect();
  process.exit(1);
});
