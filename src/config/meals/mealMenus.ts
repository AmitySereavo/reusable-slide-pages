import type { MealMenuCatalog } from "@/types/questionnaire";

export const mealMenus: MealMenuCatalog = {
  menus: [
    {
      id: "vegan-event-menu",
      label: "Vegan Event Menu",
      groups: [
        {
          id: "base",
          label: "Choose your base",
          required: true,
          options: [
            { id: "plain-rice", label: "Plain rice" },
            { id: "rice-and-peas", label: "Rice and peas" },
            { id: "boiled-food", label: "Boiled dumpling, banana & yam" },
          ],
        },
        {
          id: "main",
          label: "Choose your main",
          required: true,
          options: [
            { id: "stew-peas", label: "Stew peas" },
            { id: "curry-chickpeas", label: "Curry chickpeas" },
          ],
        },
        {
          id: "side",
          label: "Choose your side",
          required: true,
          options: [
            { id: "potato-salad", label: "Potato salad" },
            { id: "sauteed-vegetables", label: "Sautéed vegetables" },
            { id: "plantain", label: "Plantain" },
            { id: "macaroni-vegan-cheese", label: "Macaroni & vegan cheese" },
            { id: "macaroni-green-peas", label: "Macaroni & green peas" },
            { id: "mashed-potatoes-green-peas", label: "Mashed potatoes & green peas" },
          ],
        },
        {
          id: "dessert",
          label: "Choose dessert",
          required: true,
          options: [
            { id: "chocolate-cake", label: "Chocolate cake" },
            { id: "sweet-potato-pudding", label: "Sweet potato pudding" },
            { id: "vegetable-patty", label: "Vegetable patty" },
            { id: "soy-patty", label: "Soy patty" },
          ],
        },
        {
          id: "drink",
          label: "Choose drink",
          required: true,
          options: [
            { id: "june-plum-juice", label: "June plum juice" },
            { id: "orange-juice", label: "Orange juice" },
            { id: "coconut-water", label: "Coconut water" },
          ],
        },
      ],
    },
  ],
};