import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import CartCheckout from "@/components/portal/CartCheckout";
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

export default async function PortalOrdersPage() {
  const session = await auth();
  const contact = await prisma.contact.findFirst({
    where: { userId: session!.user.id },
  });

  const orders = contact
    ? await prisma.order.findMany({
        where: { contactId: contact.id },
        include: {
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { placedAt: "desc" },
      })
    : [];

  return (
    <div className="space-y-8">
      <CartCheckout />

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order History</h2>
        {orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-white rounded-xl border">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No orders yet</p>
            <p className="text-sm mt-1">
              <Link href="/catalog" className="text-blue-600 hover:underline">Browse the catalog</Link> to place your first order
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{o.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{new Date(o.placedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]}`}>{o.status}</span>
                    <p className="text-sm font-semibold mt-1">${Number(o.totalAmount).toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t space-y-1">
                  {o.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm text-muted-foreground">
                      <span>{item.product.name}</span>
                      <span>×{item.quantity} · ${(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
