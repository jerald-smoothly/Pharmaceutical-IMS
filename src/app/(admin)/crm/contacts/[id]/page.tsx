import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, Phone, Briefcase, FileText, ShoppingCart, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import ContactFormDialog from "@/components/admin/ContactFormDialog";
import AssignCompanyDialog from "@/components/admin/AssignCompanyDialog";

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [contact, companies] = await Promise.all([
    prisma.contact.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        orders: {
          orderBy: { placedAt: "desc" },
          take: 10,
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

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/crm/contacts" className="text-sm text-muted-foreground hover:text-foreground">
            ← Contacts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {contact.firstName} {contact.lastName}
          </h1>
          {contact.title && (
            <p className="text-muted-foreground">
              {contact.title}{contact.department ? ` · ${contact.department}` : ""}
            </p>
          )}
        </div>
        <ContactFormDialog contact={contact} companies={companies}>
          <button className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
            Edit Contact
          </button>
        </ContactFormDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
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
              {(contact.title || contact.department) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-4 h-4 shrink-0" />
                  {[contact.title, contact.department].filter(Boolean).join(" · ")}
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
                  className="font-medium text-sm hover:text-blue-600 transition-colors"
                >
                  {contact.company.name}
                  {contact.company.industry && (
                    <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                      {contact.company.industry}
                    </span>
                  )}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">No company assigned.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Recent Orders ({contact.orders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contact.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No orders yet.</p>
              ) : (
                <div className="space-y-2">
                  {contact.orders.map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                      <div>
                        <Link href={`/orders/${o.id}`} className="font-medium hover:text-blue-600">
                          {o.orderNumber}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.placedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">${Number(o.totalAmount).toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] ?? "bg-gray-100 text-gray-700"}`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
