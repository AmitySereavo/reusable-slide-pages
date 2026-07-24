import { redirect } from "next/navigation";

export default function AdminEventOrdersPage() {
  redirect("/dashboard/orders?fulfillmentType=physical");
}
