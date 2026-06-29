import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import PortalNav from "@/components/portal/PortalNav";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (["ADMIN", "STAFF"].includes(session.user.role)) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar user={session.user} />
        <main className="flex-1 overflow-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav user={session.user} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
