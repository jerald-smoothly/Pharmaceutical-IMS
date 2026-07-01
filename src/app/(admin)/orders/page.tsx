import { prisma } from "@/lib/db";
import Link from "next/link";
import OrdersTable from "@/components/admin/OrdersTable";

const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

async function getOrders(status: string, page: number) {
  const limit = 25;
  const where = status ? { status: status as never } : {};
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        company: { select: { name: true } },
        contact: { select: { firstName: true, lastName: true } },
        items: { select: { quantity: true } },
      },
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      placedAt: o.placedAt.toISOString(),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      company: o.company,
      contact: o.contact,
    })),
    total,
    pages: Math.ceil(total / limit),
  };
}

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? "";
  const page = parseInt(params.page ?? "1");
  const { orders, total, pages } = await getOrders(status, page);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Orders</h1>
          <p className="text-muted-foreground">{total} orders</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/orders" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!status ? "bg-gray-900 text-white dark:bg-foreground dark:text-background" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[var(--rx-surface)] dark:text-muted-foreground dark:hover:bg-muted"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`?status=${s}`} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${status === s ? "bg-gray-900 text-white dark:bg-foreground dark:text-background" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[var(--rx-surface)] dark:text-muted-foreground dark:hover:bg-muted"}`}>
            {s}
          </Link>
        ))}
      </div>

      <OrdersTable orders={orders} status={status} page={page} pages={pages} />
    </div>
  );
}
