import { prisma } from "@/lib/db";

async function nextSeq(name: string): Promise<string> {
  const r = await prisma.$queryRaw<[{ nextval: bigint }]>`SELECT nextval(${name})`;
  return String(r[0].nextval);
}

export const nextContactId = () => nextSeq("rx_contact_id_seq");
export const nextCompanyId = () => nextSeq("rx_company_id_seq");
export const nextOrderId   = () => nextSeq("rx_order_id_seq");
export const nextProductId = () => nextSeq("rx_product_id_seq");
