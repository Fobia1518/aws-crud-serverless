const { z } = require("zod");

// enum
const CATEGORIES = Object.freeze([
  "electronics",
  "tools",
  "clothing",
  "home",
  "other",
]);

const itemSchema = z.object({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name is too long")
    .trim(),

  price: z
    .number()
    .positive("Price must be a positive number")
    .max(1000000, "Price is too high"),

  category: z.enum(CATEGORIES, {
    errorMap: () => ({
      message:
        "Please select a valid category: electronics, tools, clothing, home, or other",
    }),
  }),

  description: z
    .string()
    .max(200, "Description cannot exceed 200 characters")
    .default("No description provided"),
});

module.exports = { itemSchema, CATEGORIES };
