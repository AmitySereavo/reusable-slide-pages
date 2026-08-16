import { redirect } from "next/navigation";

export default async function PlantRecipesPage() {
  redirect("/dashboard/plant-production-timeline");
}
