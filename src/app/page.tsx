import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (["ADMIN", "STAFF"].includes(session.user.role)) redirect("/dashboard");
  redirect("/catalog");
}
