import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!["ADMIN", "STAFF"].includes(session.user.role)) redirect("/catalog");

  return (
    <div className="flex h-screen bg-[#f5f6f8]">
      <AdminSidebar user={session.user} />
      <main className="flex-1 overflow-auto flex flex-col">
        {children}
      </main>
    </div>
  );
}
