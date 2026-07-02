import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, Phone, Globe, MapPin, FileText, Hash, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import CompanyFormDialog from "@/components/admin/CompanyFormDialog";
import LinkContactDialog from "@/components/admin/LinkContactDialog";
import AssociationsPanel, { AssocSection } from "@/components/admin/AssociationsPanel";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const orderWhere = {
    OR: [
      { companyId: id },
      { contact: { companyId: id } },
    ],
  } as const;

  const [company, availableContacts, combinedOrders, totalOrderCount, orderedProducts] = await Promise.all([
    prisma.company.findUnique({
      where: { id },
      include: {
        contacts: { where: { isActive: true }, orderBy: { firstName: "asc" } },
        _count: { select: { contacts: true } },
      },
    }),
    prisma.contact.findMany({
      where: {
        isActive: true,
        OR: [{ companyId: null }, { companyId: { not: id } }],
      },
      select: { id: true, firstName: true, lastName: true, email: true, company: { select: { name: true } } },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { placedAt: "desc" },
      distinct: ["id"],
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.order.count({ where: orderWhere }),
    prisma.product.findMany({
      where: { orderItems: { some: { order: orderWhere } } },
      select: { id: true, name: true, sku: true, productNumber: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!company) notFound();

  const totalSpent = combinedOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

  return (
    <div className="p-8">
      <div className="flex gap-8 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <Link href="/crm/companies" className="text-sm text-muted-foreground hover:text-foreground">
                ← Companies
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">{company.name}</h1>
            </div>
            <CompanyFormDialog company={company}>
              <button className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Edit
              </button>
            </CompanyFormDialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalOrderCount}</p>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-green-600">$</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Company Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {company.companyNumber && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="text-xs">Company ID:</span>
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">
                    {company.companyNumber}
                  </span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <a href={`mailto:${company.email}`} className="hover:text-foreground">{company.email}</a>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  {company.phone}
                </div>
              )}
              {company.website && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="w-4 h-4 shrink-0" />
                  <a href={company.website} target="_blank" rel="noreferrer" className="hover:text-foreground truncate">{company.website}</a>
                </div>
              )}
              {(company.address || company.city || company.country) && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    {company.address && <p>{company.address}</p>}
                    {[company.city, company.state, company.postalCode].filter(Boolean).join(", ") && (
                      <p>{[company.city, company.state, company.postalCode].filter(Boolean).join(", ")}</p>
                    )}
                    {company.country && <p>{company.country}</p>}
                  </div>
                </div>
              )}
              {company.taxId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4 shrink-0" />
                  Tax ID: {company.taxId}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Orders table */}
          {combinedOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Orders ({totalOrderCount})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Order ID</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Placed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {combinedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${o.id}`} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3">
                          {o.contact ? (
                            <Link href={`/crm/contacts/${o.contact.id}`} className="text-blue-600 hover:underline">
                              {o.contact.firstName} {o.contact.lastName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Associations panel */}
        <div className="w-72 shrink-0 sticky top-8">
          <AssociationsPanel>
            <AssocSection
              title="Contacts"
              items={company.contacts.map((c) => ({
                id: c.id,
                label: `${c.firstName} ${c.lastName}`,
                sublabel: c.email,
                href: `/crm/contacts/${c.id}`,
              }))}
              action={<LinkContactDialog companyId={id} contacts={availableContacts} />}
              emptyText="No contacts linked"
            />
            <AssocSection
              title="Orders"
              items={combinedOrders.map((o) => ({
                id: o.id,
                label: `Order #${o.orderNumber}`,
                sublabel: new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
                href: `/orders/${o.id}`,
              }))}
              emptyText="No orders yet"
            />
            <AssocSection
              title="Inventory"
              note="Orders"
              items={orderedProducts.map((p) => ({
                id: p.id,
                label: p.name,
                sublabel: p.sku,
                href: `/inventory/${p.id}`,
              }))}
              emptyText="No inventory ordered"
            />
          </AssociationsPanel>
        </div>
      </div>
    </div>
  );
}
