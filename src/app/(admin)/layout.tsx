import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "STAFF"].includes(session.user.role)) redirect("/portal");

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
