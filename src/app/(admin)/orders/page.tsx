import { prisma } from "@/lib/db";
import Link from "next/link";
import { Upload, Plus } from "lucide-react";
import OrdersTable from "@/components/admin/OrdersTable";
import OrderFormDialog from "@/components/admin/OrderFormDialog";

const statuses: { value: string; label: string }[] = [
  { value: "PENDING",    label: "Pending" },
  { value: "CONFIRMED",  label: "Confirmed" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED",    label: "Shipped" },
  { value: "DELIVERED",  label: "Delivered" },
  { value: "CANCELLED",  label: "Cancelled" },
];

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

async function getFormData() {
  const now = new Date();
  const [contactsRaw, companiesRaw, productsRaw] = await Promise.all([
    prisma.contact.findMany({
      where: { isActive: true },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, sku: true, unitPrice: true, unit: true,
        batches: {
          where: { expiryDate: { gt: now } },
          select: { quantityIn: true, quantityOut: true, quantityOnHold: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    contacts: contactsRaw,
    companies: companiesRaw,
    products: productsRaw.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      unitPrice: Number(p.unitPrice),
      unit: p.unit,
      stock: p.batches.reduce((s, b) => s + b.quantityIn - b.quantityOut - b.quantityOnHold, 0),
    })),
  };
}

export default async function OrdersPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? "";
  const page = parseInt(params.page ?? "1");
  const [{ orders, total, pages }, formData] = await Promise.all([
    getOrders(status, page),
    getFormData(),
  ]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-foreground">Orders</h1>
          <p className="text-muted-foreground">{total} orders</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/import"
            className="inline-flex items-center gap-2 h-8 px-2.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
          >
            <Upload className="w-4 h-4" />
            Import Order
          </Link>
          <OrderFormDialog products={formData.products} contacts={formData.contacts} companies={formData.companies}>
            <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/80 h-8 px-2.5 rounded-lg text-sm font-medium transition-all">
              <Plus className="w-4 h-4" />
              Create Order
            </button>
          </OrderFormDialog>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Link href="/orders" className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${!status ? "bg-gray-900 text-white dark:bg-foreground dark:text-background" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[var(--rx-surface)] dark:text-muted-foreground dark:hover:bg-muted"}`}>
          All
        </Link>
        {statuses.map((s) => (
          <Link key={s.value} href={`?status=${s.value}`} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${status === s.value ? "bg-gray-900 text-white dark:bg-foreground dark:text-background" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[var(--rx-surface)] dark:text-muted-foreground dark:hover:bg-muted"}`}>
            {s.label}
          </Link>
        ))}
      </div>

      <OrdersTable orders={orders} status={status} page={page} pages={pages} />
    </div>
  );
}
