"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const result = await signIn("credentials", {
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@company.com"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
