import { prisma } from "@/lib/db";
import { Package } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getProducts(search: string) {
  const now = new Date();
  const where = {
    isActive: true,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { genericName: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const products = await prisma.product.findMany({
    where,
    include: {
      batches: {
        where: { expiryDate: { gt: now } },
        select: { quantityIn: true, quantityOut: true, quantityOnHold: true },
      },
    },
    orderBy: { name: "asc" },
    take: 48,
  });

  return products.map((p) => ({
    ...p,
    stock: p.batches.reduce((s, b) => s + b.quantityIn - b.quantityOut - b.quantityOnHold, 0),
  }));
}

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function EmbedCatalogPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = params.search ?? "";
  const products = await getProducts(search);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#f9fafb", minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", background: "#2563eb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package style={{ width: "16px", height: "16px", color: "white" }} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "15px", margin: 0, color: "#111827" }}>RxPharmas</p>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Product Catalog</p>
            </div>
          </div>
          <Link
            href="/register"
            target="_top"
            style={{ display: "inline-flex", alignItems: "center", height: "36px", padding: "0 16px", borderRadius: "8px", background: "#2563eb", color: "white", textDecoration: "none", fontSize: "13px", fontWeight: 500 }}
          >
            Sign up to place orders
          </Link>
        </div>

        <form method="GET" style={{ marginBottom: "20px", display: "flex", gap: "8px" }}>
          <input
            name="search"
            defaultValue={search}
            placeholder="Search products, generics, categories..."
            style={{ flex: 1, border: "1px solid #d1d5db", borderRadius: "8px", padding: "8px 12px", fontSize: "13px", outline: "none" }}
          />
          <button
            type="submit"
            style={{ height: "36px", padding: "0 16px", borderRadius: "8px", background: "#2563eb", color: "white", border: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
          >
            Search
          </button>
        </form>

        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "16px" }}>{products.length} product{products.length !== 1 ? "s" : ""} available</p>

        {products.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
            <p style={{ fontSize: "15px", fontWeight: 500 }}>No products found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {products.map((p) => (
              <div key={p.id} style={{ background: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "6px" }}>
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "13px", margin: "0 0 2px", color: "#111827", lineHeight: 1.3 }}>{p.name}</p>
                      {p.genericName && <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>{p.genericName}</p>}
                    </div>
                    {p.requiresPrescription && (
                      <span style={{ fontSize: "10px", background: "#dbeafe", color: "#1d4ed8", padding: "2px 6px", borderRadius: "4px", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>Rx</span>
                    )}
                  </div>
                  {p.category && (
                    <span style={{ display: "inline-block", marginTop: "6px", fontSize: "10px", background: "#f3f4f6", color: "#4b5563", padding: "2px 8px", borderRadius: "999px" }}>{p.category}</span>
                  )}
                </div>
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "10px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "#111827" }}>${Number(p.unitPrice).toFixed(2)}</p>
                    <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>per {p.unit}</p>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: p.stock === 0 ? "#dc2626" : p.stock < 10 ? "#d97706" : "#16a34a" }}>
                    {p.stock === 0 ? "Out of stock" : `${p.stock} in stock`}
                  </span>
                </div>
                <Link
                  href="/register"
                  target="_top"
                  style={{ display: "block", textAlign: "center", background: p.stock === 0 ? "#f3f4f6" : "#eff6ff", color: p.stock === 0 ? "#9ca3af" : "#2563eb", textDecoration: "none", borderRadius: "8px", padding: "6px", fontSize: "12px", fontWeight: 500 }}
                >
                  {p.stock === 0 ? "Out of stock" : "Sign up to order"}
                </Link>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "11px", color: "#9ca3af" }}>
            Powered by{" "}
            <Link href="/login" target="_top" style={{ color: "#2563eb", textDecoration: "none" }}>
              RxPharmas
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
