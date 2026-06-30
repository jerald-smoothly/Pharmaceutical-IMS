import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Mail, Phone, Globe, MapPin, FileText, Users, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import CompanyFormDialog from "@/components/admin/CompanyFormDialog";
import LinkContactDialog from "@/components/admin/LinkContactDialog";
import UnlinkContactButton from "@/components/admin/UnlinkContactButton";


export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Combined order filter: direct company orders + orders placed by this company's contacts
  const orderWhere = {
    OR: [
      { companyId: id },
      { contact: { companyId: id } },
    ],
  } as const;

  const [company, availableContacts, combinedOrders, totalOrderCount] = await Promise.all([
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
  ]);

  if (!company) notFound();

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/crm/companies" className="text-sm text-muted-foreground hover:text-foreground">
              ← Companies
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
          {company.industry && <p className="text-muted-foreground">{company.industry}</p>}
        </div>
        <CompanyFormDialog company={company}>
          <button className="inline-flex items-center h-8 px-3 rounded-lg text-sm font-medium border border-border bg-background hover:bg-muted transition-all">
            Edit
          </button>
        </CompanyFormDialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
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
              {company.notes && (
                <div className="pt-2 border-t text-muted-foreground">{company.notes}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Contacts ({company._count.contacts})
                </CardTitle>
                <LinkContactDialog companyId={id} contacts={availableContacts} />
              </div>
            </CardHeader>
            <CardContent>
              {company.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet. Use &quot;Link Contact&quot; to add one.</p>
              ) : (
                <div className="space-y-2">
                  {company.contacts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <Link href={`/crm/contacts/${c.id}`} className="font-medium text-sm hover:text-blue-600">
                          {c.firstName} {c.lastName}
                        </Link>
                        {c.title && <p className="text-xs text-muted-foreground">{c.title}</p>}
                      </div>
                      <div className="flex items-center gap-4">
                        <a href={`mailto:${c.email}`} className="text-xs text-muted-foreground hover:text-foreground">{c.email}</a>
                        <UnlinkContactButton contactId={c.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Total Orders ({totalOrderCount})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {combinedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground px-4 py-6">No orders yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Order Number</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Order Date</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Order Placed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {combinedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/orders/${o.id}`}
                            className="font-mono text-xs font-semibold text-blue-600 hover:underline"
                          >
                            {o.orderNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          {new Date(o.placedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {o.contact ? (
                            <Link
                              href={`/crm/contacts/${o.contact.id}`}
                              className="text-blue-600 hover:underline"
                            >
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
