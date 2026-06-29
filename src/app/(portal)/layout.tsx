import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import PortalNav from "@/components/portal/PortalNav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (["ADMIN", "STAFF"].includes(session.user.role)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50">
      <PortalNav user={session.user} />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
