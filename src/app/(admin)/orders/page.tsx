import { prisma } from "@/lib/db";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

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
  return { orders, total, pages: Math.ceil(total / limit) };
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
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-muted-foreground">{total} orders</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/orders" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!status ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`?status=${s}`} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${status === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
            {s}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-medium">No orders found</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Order #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Items</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/orders/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{o.company?.name ?? (o.contact ? `${o.contact.firstName} ${o.contact.lastName}` : "Unknown")}</p>
                    {o.company && o.contact && (
                      <p className="text-xs text-muted-foreground">{o.contact.firstName} {o.contact.lastName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.items.reduce((s, i) => s + i.quantity, 0)} units</td>
                  <td className="px-4 py-3 font-medium">${Number(o.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(o.placedAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={`?status=${status}&page=${page - 1}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Previous</Link>}
            {page < pages && <Link href={`?status=${status}&page=${page + 1}`} className="inline-flex items-center h-7 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">Next</Link>}
          </div>
        </div>
      )}
    </div>
  );
}
