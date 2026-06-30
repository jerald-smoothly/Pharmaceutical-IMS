import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, Building2, TrendingUp, AlertTriangle, Code2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { headers } from "next/headers";
import EmbedSnippet from "@/components/admin/EmbedSnippet";

async function getOrigin() {
  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

async function getStats() {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [orders, contacts, companies, expiringBatches, recentOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.contact.count({ where: { isActive: true } }),
      prisma.company.count({ where: { isActive: true } }),
      prisma.productBatch.findMany({
        where: { expiryDate: { lte: thirtyDaysOut, gte: now } },
        include: { product: { select: { name: true, sku: true } } },
        orderBy: { expiryDate: "asc" },
        take: 5,
      }),
      prisma.order.findMany({
        orderBy: { placedAt: "desc" },
        take: 5,
        include: { company: { select: { name: true } }, contact: { select: { firstName: true, lastName: true } } },
      }),
    ]);

  return { orders, contacts, companies, expiringBatches, recentOrders };
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function DashboardPage() {
  const [{ orders, contacts, companies, expiringBatches, recentOrders }, origin] =
    await Promise.all([getStats(), getOrigin()]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your pharmaceutical inventory and orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Orders", value: orders, icon: ShoppingCart, color: "text-green-600" },
          { label: "Contacts", value: contacts, icon: Users, color: "text-purple-600" },
          { label: "Companies", value: companies, icon: Building2, color: "text-orange-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-3xl font-bold mt-1">{value}</p>
                </div>
                <Icon className={`w-8 h-8 ${color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="w-4 h-4 text-blue-500" />
            Embed catalog on your website
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Paste this snippet anywhere on your website to display your live product catalog. Visitors can browse and sign up directly to place orders.
          </p>
          <EmbedSnippet origin={origin} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Expiring Soon (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expiringBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No batches expiring soon.</p>
            ) : (
              <div className="space-y-3">
                {expiringBatches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{b.product.name}</p>
                      <p className="text-muted-foreground">Batch {b.batchNumber}</p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      {b.expiryDate.toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{o.orderNumber}</p>
                      <p className="text-muted-foreground">
                        {o.company?.name ??
                          (o.contact
                            ? `${o.contact.firstName} ${o.contact.lastName}`
                            : "Unknown")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status]}`}
                    >
                      {o.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
