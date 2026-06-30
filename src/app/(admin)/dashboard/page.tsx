import Link from "next/link";
import { prisma } from "@/lib/db";

async function getStats() {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [orders, contacts, companies, expiringBatches, recentOrders] = await Promise.all([
    prisma.order.count(),
    prisma.contact.count({ where: { isActive: true } }),
    prisma.company.count({ where: { isActive: true } }),
    prisma.productBatch.findMany({
      where: { expiryDate: { lte: thirtyDaysOut, gte: now } },
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { expiryDate: "asc" },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 5,
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return { orders, contacts, companies, expiringBatches, recentOrders };
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  DELIVERED:   { bg: "#e8f6ed", text: "#137a3e" },
  SHIPPED:     { bg: "#eaecfb", text: "#4338ca" },
  PROCESSING:  { bg: "#f1eafb", text: "#7c3aed" },
  CONFIRMED:   { bg: "#e8f0fc", text: "#1d4ed8" },
  PENDING:     { bg: "#fdf3e3", text: "#b45309" },
  CANCELLED:   { bg: "#fce8e8", text: "#b91c1c" },
};

function urgencyStyle(daysLeft: number): { bar: string; pillBg: string; pillText: string; label: string } {
  if (daysLeft <= 7)  return { bar: "#dc2626", pillBg: "#fdecec", pillText: "#c0392b", label: `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}` };
  if (daysLeft <= 14) return { bar: "#ea580c", pillBg: "#fdf0e6", pillText: "#c2540f", label: `in ${daysLeft} days` };
  return               { bar: "#d99411", pillBg: "#fbf3e0", pillText: "#a9760a", label: `in ${daysLeft} days` };
}

export default async function DashboardPage() {
  const { orders, contacts, companies, expiringBatches, recentOrders } = await getStats();
  const now = new Date();

  const todayLabel = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Sticky frosted header ── */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-8 py-[22px] bg-white/80 backdrop-blur-sm border-b border-[#ebedf0]">
        <div>
          <h1 className="text-[21px] font-bold tracking-tight text-[#0f1729] m-0">Dashboard</h1>
          <p className="text-[13px] text-[#6b7484] mt-0.5">{todayLabel} · Overview of inventory &amp; orders</p>
        </div>
        <Link
          href="/orders"
          className="flex items-center gap-[7px] h-[38px] px-4 bg-[#3b6fd4] text-white rounded-[10px] text-[13px] font-semibold shadow-[0_4px_12px_-4px_rgba(59,111,212,0.6)] hover:brightness-110 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          View Orders
        </Link>
      </header>

      {/* ── Main content ── */}
      <div className="px-8 py-[26px] pb-9 flex flex-col gap-[22px]">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-[18px]">

          {/* Total Orders */}
          <Link href="/orders" className="block group">
            <div className="bg-white border border-[#ebedf0] rounded-2xl p-5 transition-all group-hover:shadow-[0_6px_22px_-10px_rgba(15,23,41,0.22)] group-hover:border-[#dfe3ea]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#6b7484]">Total Orders</span>
                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#eef3fd] flex items-center justify-center">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
                    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
                  </svg>
                </div>
              </div>
              <div className="mt-[14px]">
                <span className="text-[32px] font-bold tracking-[-1px] text-[#0f1729] leading-none">{orders.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-[12px] text-[#8a93a3]">All time</div>
            </div>
          </Link>

          {/* Contacts */}
          <Link href="/crm/contacts" className="block group">
            <div className="bg-white border border-[#ebedf0] rounded-2xl p-5 transition-all group-hover:shadow-[0_6px_22px_-10px_rgba(15,23,41,0.22)] group-hover:border-[#dfe3ea]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#6b7484]">Active Contacts</span>
                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#f1eafb] flex items-center justify-center">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/>
                  </svg>
                </div>
              </div>
              <div className="mt-[14px]">
                <span className="text-[32px] font-bold tracking-[-1px] text-[#0f1729] leading-none">{contacts.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-[12px] text-[#8a93a3]">across {companies} companies</div>
            </div>
          </Link>

          {/* Companies */}
          <Link href="/crm/companies" className="block group">
            <div className="bg-white border border-[#ebedf0] rounded-2xl p-5 transition-all group-hover:shadow-[0_6px_22px_-10px_rgba(15,23,41,0.22)] group-hover:border-[#dfe3ea]">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#6b7484]">Companies</span>
                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#fdf1e7] flex items-center justify-center">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ea7a2c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="2" width="16" height="20" rx="2"/>
                    <path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01"/>
                  </svg>
                </div>
              </div>
              <div className="mt-[14px]">
                <span className="text-[32px] font-bold tracking-[-1px] text-[#0f1729] leading-none">{companies.toLocaleString()}</span>
              </div>
              <div className="mt-2 text-[12px] text-[#8a93a3]">Active clients &amp; partners</div>
            </div>
          </Link>
        </div>

        {/* ── Panels ── */}
        <div className="grid gap-[18px] items-start" style={{ gridTemplateColumns: "1.32fr 1fr" }}>

          {/* Expiring Soon */}
          <section className="bg-white border border-[#ebedf0] rounded-2xl overflow-hidden">
            <div className="px-[22px] pt-[18px] pb-[14px] border-b border-[#f0f1f4]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[10px]">
                  <div className="w-[30px] h-[30px] rounded-[8px] bg-[#fdecec] flex items-center justify-center">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <path d="M12 9v4M12 17h.01"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#0f1729] tracking-tight m-0">Expiring Soon</h2>
                    <p className="text-[12px] text-[#8a93a3] mt-0.5 m-0">Batches within 30 days</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-[9px] py-1 bg-[#fdecec] rounded-[7px] text-[12px] font-semibold text-[#c0392b]">
                  {expiringBatches.length} batch{expiringBatches.length !== 1 ? "es" : ""}
                </span>
              </div>
            </div>

            <div className="px-2 py-2">
              {expiringBatches.length === 0 ? (
                <p className="text-[13px] text-[#8a93a3] px-4 py-6 text-center">No batches expiring in the next 30 days.</p>
              ) : (
                expiringBatches.map((b) => {
                  const daysLeft = Math.ceil((b.expiryDate.getTime() - now.getTime()) / 86400000);
                  const u = urgencyStyle(daysLeft);
                  const stock = b.quantityIn - b.quantityOut - b.quantityOnHold;
                  return (
                    <div key={b.id} className="flex items-center gap-[14px] px-[14px] py-[13px] rounded-[11px] hover:bg-[#fafbfc] transition-colors">
                      <div className="w-1 self-stretch rounded-[3px] shrink-0" style={{ background: u.bar }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-semibold text-[#1a2030]">{b.product.name}</div>
                        <div className="mt-0.5 text-[11.5px] text-[#9aa3b2]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                          {b.product.sku} · Batch {b.batchNumber} · {stock} {stock === 1 ? "unit" : "units"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center px-[9px] py-[3px] rounded-full text-[11.5px] font-semibold" style={{ background: u.pillBg, color: u.pillText }}>
                          {u.label}
                        </span>
                        <div className="mt-1 text-[11px] text-[#9aa3b2]">
                          Exp. {b.expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <Link
              href="/inventory?expiry=30"
              className="flex items-center justify-center gap-1.5 py-[13px] border-t border-[#f0f1f4] text-[12.5px] font-semibold text-[#6b7484] hover:text-[#3b6fd4] transition-colors"
            >
              View all expiring inventory
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </Link>
          </section>

          {/* Recent Orders */}
          <section className="bg-white border border-[#ebedf0] rounded-2xl overflow-hidden">
            <div className="px-[22px] pt-[18px] pb-4 border-b border-[#f0f1f4] flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] rounded-[8px] bg-[#eef3fd] flex items-center justify-center">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#3b6fd4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18"/><path d="m7 14 3-4 3 2 4-6"/>
                </svg>
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[#0f1729] tracking-tight m-0">Recent Orders</h2>
                <p className="text-[12px] text-[#8a93a3] mt-0.5 m-0">Latest activity</p>
              </div>
            </div>

            <div className="px-2 py-2">
              {recentOrders.length === 0 ? (
                <p className="text-[13px] text-[#8a93a3] px-4 py-6 text-center">No orders yet.</p>
              ) : (
                recentOrders.map((o) => {
                  const s = STATUS_STYLES[o.status] ?? STATUS_STYLES.PENDING;
                  const customer = o.company?.name ?? (o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : "Unknown");
                  return (
                    <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-3 px-[14px] py-[13px] rounded-[11px] hover:bg-[#fafbfc] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-[#1a2030]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                          {o.orderNumber}
                        </div>
                        <div className="mt-0.5 text-[12px] text-[#8a93a3] truncate">{customer}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="px-[9px] py-[3px] rounded-full text-[10.5px] font-bold tracking-wide" style={{ background: s.bg, color: s.text }}>
                          {o.status}
                        </span>
                        <span className="text-[12.5px] font-semibold text-[#1a2030]" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
                          ${Number(o.totalAmount).toFixed(2)}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <Link
              href="/orders"
              className="flex items-center justify-center gap-1.5 py-[13px] border-t border-[#f0f1f4] text-[12.5px] font-semibold text-[#6b7484] hover:text-[#3b6fd4] transition-colors"
            >
              View all orders
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6"/>
              </svg>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
