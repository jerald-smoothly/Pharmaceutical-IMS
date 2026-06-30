import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Building2, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import AssignCompanyDialog from "@/components/admin/AssignCompanyDialog";


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-2.5 border-b last:border-0">
      <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{children}</span>
    </div>
  );
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        orders: {
          orderBy: { placedAt: "desc" },
        },
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
  const initials = `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Link href="/crm/contacts" className="text-sm text-muted-foreground hover:text-foreground">
          ← Contacts
        </Link>
        <ContactFormDialog contact={contact} companies={companies}>
          <button className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
            Edit Contact
          </button>
        </ContactFormDialog>
      </div>

      {/* Profile banner */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl font-bold text-blue-600 shrink-0 select-none">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {contact.firstName} {contact.lastName}
          </h1>
          {(contact.title || contact.department) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {[contact.title, contact.department].filter(Boolean).join(" · ")}
            </p>
          )}
          {contact.company && (
            <Link
              href={`/crm/companies/${contact.company.id}`}
              className="text-sm text-blue-600 hover:underline mt-0.5 inline-block"
            >
              {contact.company.name}
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-1 space-y-4">
          {/* Personal Information */}
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="px-4 py-0 pb-1">
              <Row label="First Name">{contact.firstName}</Row>
              <Row label="Last Name">{contact.lastName}</Row>
              <Row label="Email">
                <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline break-all">
                  {contact.email}
                </a>
              </Row>
              <Row label="Phone">
                {contact.phone ?? <span className="text-muted-foreground">—</span>}
              </Row>
              <Row label="Title">
                {contact.title ?? <span className="text-muted-foreground">—</span>}
              </Row>
              <Row label="Department">
                {contact.department ?? <span className="text-muted-foreground">—</span>}
              </Row>
              {contact.customerId && (
                <Row label="Customer ID">
                  <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                    {contact.customerId}
                  </span>
                </Row>
              )}
              {contact.notes && (
                <Row label="Notes">
                  <span className="text-muted-foreground">{contact.notes}</span>
                </Row>
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
                <Link
                  href={`/crm/companies/${contact.company.id}`}
                  className="group block"
                >
                  <p className="font-medium text-sm group-hover:text-blue-600 transition-colors">
                    {contact.company.name}
                  </p>
                  {contact.company.industry && (
                    <p className="text-xs text-muted-foreground mt-0.5">{contact.company.industry}</p>
                  )}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No company assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
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

          {/* Orders table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Orders Placed
                {contact.company && (
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    Included in{" "}
                    <Link href={`/crm/companies/${contact.company.id}`} className="text-blue-600 hover:underline">
                      {contact.company.name}
                    </Link>
                    &apos;s totals
                  </span>
                )}
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
