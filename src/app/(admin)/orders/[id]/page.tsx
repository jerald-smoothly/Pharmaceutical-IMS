import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hash } from "lucide-react";
import Link from "next/link";
import OrderStatusUpdater from "@/components/admin/OrderStatusUpdater";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      company: true,
      contact: true,
      items: { include: { product: { select: { id: true, productNumber: true, name: true, sku: true, unit: true } } } },
    },
  });

  if (!order) notFound();

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground">← Orders</Link>
          <div className="flex items-center gap-2 mt-1">
            <Hash className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Order ID:</span>
            <span className="font-mono text-sm bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">{order.orderNumber}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Order Details</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>{order.status}</span>
            <span className="text-sm text-muted-foreground">{new Date(order.placedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </div>
        <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          {order.company && (
            <Card>
              <CardHeader><CardTitle className="text-base">Company</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <Link href={`/crm/companies/${order.company.id}`} className="font-medium text-blue-600 hover:underline">{order.company.name}</Link>
                {order.company.email && <p className="text-muted-foreground">{order.company.email}</p>}
                {order.company.phone && <p className="text-muted-foreground">{order.company.phone}</p>}
              </CardContent>
            </Card>
          )}
          {order.contact && (
            <Card>
              <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <Link href={`/crm/contacts/${order.contact.id}`} className="font-medium text-blue-600 hover:underline">
                  {order.contact.firstName} {order.contact.lastName}
                </Link>
                <p className="text-muted-foreground">{order.contact.email}</p>
                {order.contact.phone && <p className="text-muted-foreground">{order.contact.phone}</p>}
              </CardContent>
            </Card>
          )}
          {order.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{order.notes}</CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Order Items</CardTitle></CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left font-medium text-gray-600">Product</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Qty</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Unit Price</th>
                    <th className="pb-2 text-right font-medium text-gray-600">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <Link href={`/inventory/${item.product.id}`} className="font-medium text-blue-600 hover:underline">
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                      </td>
                      <td className="py-3 text-right">{item.quantity} {item.product.unit}</td>
                      <td className="py-3 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                      <td className="py-3 text-right font-medium">${(Number(item.unitPrice) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t">
                    <td colSpan={3} className="pt-3 text-right font-semibold">Total</td>
                    <td className="pt-3 text-right font-bold text-lg">${Number(order.totalAmount).toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
