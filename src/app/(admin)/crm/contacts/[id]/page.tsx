import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, Phone, Briefcase, Hash, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import AssignCompanyDialog from "@/components/admin/AssignCompanyDialog";
import AssociationsPanel, { AssocSection } from "@/components/admin/AssociationsPanel";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contact, companies, orderedProducts] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, email: true, phone: true, website: true } },
        orders: { orderBy: { placedAt: "desc" } },
      },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { orderItems: { some: { order: { contactId: id } } } },
      select: { id: true, name: true, sku: true, productNumber: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contact) notFound();

  return (
    <div className="p-8">
      <div className="flex gap-8 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <Link href="/crm/contacts" className="text-sm text-muted-foreground hover:text-foreground">
                ← Contacts
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                {contact.firstName} {contact.lastName}
              </h1>
              {(contact.title || contact.department) && (
                <p className="text-muted-foreground">
                  {[contact.title, contact.department].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <ContactFormDialog contact={contact}>
              <button className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
                Edit Contact
              </button>
            </ContactFormDialog>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:text-foreground truncate">
                  {contact.email}
                </a>
              </div>
              {contact.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  {contact.phone}
                </div>
              )}
              {contact.title && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  {contact.title}
                </div>
              )}
              {contact.customerId && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="w-4 h-4 shrink-0" />
                  <span className="text-xs">Contact ID:</span>
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-900">
                    {contact.customerId}
                  </span>
                </div>
              )}
              {contact.notes && (
                <div className="flex items-start gap-2 text-muted-foreground pt-2 border-t">
                  <FileText className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{contact.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {contact.orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders Placed ({contact.orders.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Order ID</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Status</th>
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {contact.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/orders/${o.id}`} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs capitalize">
                          {o.status.charAt(0) + o.status.slice(1).toLowerCase()}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
              title="Company"
              items={contact.company ? [{
                id: contact.company.id,
                label: contact.company.name,
                href: `/crm/companies/${contact.company.id}`,
              }] : []}
              action={
                <AssignCompanyDialog
                  contactId={contact.id}
                  currentCompanyId={contact.companyId ?? null}
                  companies={companies}
                />
              }
              emptyText="No company assigned"
            />
            <AssocSection
              title="Orders"
              items={contact.orders.map((o) => ({
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
