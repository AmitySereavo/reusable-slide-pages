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
          billingMode: "included",
          includedServings: 1,
          options: [
            { id: "plain-rice", label: "Plain rice", price: 5 },
            { id: "rice-and-peas", label: "Rice and peas", price: 6 },
            { id: "boiled-food", label: "Boiled dumpling, banana & yam", price: 6 },
          ],
        },
        {
          id: "main",
          label: "Choose your main",
          required: true,
          billingMode: "included",
          includedServings: 1,
          options: [
            { id: "stew-peas", label: "Stew peas", price: 8 },
            { id: "curry-chickpeas", label: "Curry chickpeas", price: 8 },
          ],
        },
        {
          id: "side",
          label: "Choose your side",
          required: true,
          billingMode: "included",
          includedServings: 1,
          options: [
            { id: "potato-salad", label: "Potato salad", price: 4 },
            { id: "sauteed-vegetables", label: "Sautéed vegetables", price: 4 },
            { id: "plantain", label: "Plantain", price: 3 },
            { id: "macaroni-vegan-cheese", label: "Macaroni & vegan cheese", price: 5 },
            { id: "macaroni-green-peas", label: "Macaroni & green peas", price: 5 },
            { id: "mashed-potatoes-green-peas", label: "Mashed potatoes & green peas", price: 5 },
          ],
        },
        {
          id: "drink",
          label: "Choose drink",
          required: true,
          billingMode: "included",
          includedServings: 1,
          options: [
            { id: "june-plum-juice", label: "June plum juice", price: 3 },
            { id: "orange-juice", label: "Orange juice", price: 3 },
            { id: "coconut-water", label: "Coconut water", price: 4 },
          ],
        },
        {
          id: "dessert",
          label: "Choose dessert",
          required: false,
          billingMode: "pay",
          includedServings: 0,
          options: [
            { id: "chocolate-cake", label: "Chocolate cake", price: 4 },
            { id: "sweet-potato-pudding", label: "Sweet potato pudding", price: 4 },
          ],
        },
        {
          id: "snack",
          label: "Choose snack",
          required: false,
          billingMode: "pay",
          includedServings: 0,
          options: [
            { id: "vegetable-patty", label: "Vegetable patty", price: 4 },
            { id: "soy-patty", label: "Soy patty", price: 4 },
            { id: "plantain-cups", label: "Plantain cups", price: 3 },
          ],
        },
        {
          id: "alcoholic-beverage",
          label: "Choose alcoholic beverage",
          required: false,
          billingMode: "pay",
          includedServings: 0,
          options: [
            { id: "rum-punch", label: "Rum punch", price: 8 },
            { id: "red-stripe", label: "Red Stripe", price: 6 },
            { id: "wine-glass", label: "Wine glass", price: 7 },
          ],
        },
      ],
    },
  ],
};
