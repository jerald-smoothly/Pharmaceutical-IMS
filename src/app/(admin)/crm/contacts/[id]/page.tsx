import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, Phone, Briefcase, Hash, FileText, Building2, ShoppingCart, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import AssignCompanyDialog from "@/components/admin/AssignCompanyDialog";

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, industry: true, email: true, phone: true, website: true } },
        orders: { orderBy: { placedAt: "desc" } },
      },
    }),
    prisma.company.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contact) notFound();

  const totalOrders = contact.orders.length;

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header — matches company profile structure */}
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
        <ContactFormDialog contact={contact} companies={companies}>
          <button className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
            Edit Contact
          </button>
        </ContactFormDialog>
      </div>

      {/* Stats — above grid, matching company profile placement */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Personal Information — icon-based rows, same style as company Details */}
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

          {/* Company */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Company
                </CardTitle>
                <AssignCompanyDialog
                  contactId={contact.id}
                  currentCompanyId={contact.companyId}
                  companies={companies}
                />
              </div>
            </CardHeader>
            <CardContent>
              {contact.company ? (
                <div>
                  <Link href={`/crm/companies/${contact.company.id}`} className="group block">
                    <p className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                      {contact.company.name}
                    </p>
                    {contact.company.industry && (
                      <p className="text-xs text-muted-foreground mt-0.5">{contact.company.industry}</p>
                    )}
                  </Link>
                  {(contact.company.email || contact.company.phone || contact.company.website) && (
                    <div className="mt-3 pt-3 border-t space-y-1.5">
                      {contact.company.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <a href={`mailto:${contact.company.email}`} className="hover:text-foreground truncate">
                            {contact.company.email}
                          </a>
                        </div>
                      )}
                      {contact.company.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          {contact.company.phone}
                        </div>
                      )}
                      {contact.company.website && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="w-3.5 h-3.5 shrink-0" />
                          <a href={contact.company.website} target="_blank" rel="noreferrer" className="hover:text-foreground truncate">
                            {contact.company.website}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No company assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right — orders table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Orders Placed
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">Order Number</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">Order Date</th>
                    <th className="px-4 py-2.5 text-center font-medium text-gray-600">Order Placed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {contact.orders.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        No orders placed yet.
                      </td>
                    </tr>
                  ) : (
                    contact.orders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <Link href={`/orders/${o.id}`} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {new Date(o.placedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contact.firstName} {contact.lastName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
