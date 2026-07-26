import { notFound } from "next/navigation";
import ReceiptView, {
  getLittleOrchardOrderItemsByToken,
  normalizeToken,
} from "../ReceiptView";

export default async function ReceiptTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = normalizeToken(rawToken);
  const items = token ? await getLittleOrchardOrderItemsByToken(token) : [];

  if (!items.length) {
    notFound();
  }

  return <ReceiptView items={items} />;
}
