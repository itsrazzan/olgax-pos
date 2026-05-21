import type { Metadata } from "next";
import { ProductForm } from "@/components/products/product-form";
import { Breadcrumb } from "@/components/ui/breadcrumb";

import { prisma } from "@/lib/db";
import { unstable_noStore as noStore } from "next/cache";

export const metadata: Metadata = { title: "New Product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  noStore();
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Breadcrumb items={[
        { label: "Products", href: "/products" },
        { label: "Add Product" },
      ]} />
      <h1 className="text-2xl font-bold mb-6">Add Product</h1>
      <ProductForm suppliers={suppliers} />
    </div>
  );
}
