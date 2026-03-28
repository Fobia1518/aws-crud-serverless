const { z } = require("zod");

const itemSchema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name is too long"),
  price: z.number()
    .positive("Price must be a positive number"),
  description: z.string()
    .max(200, "Description cannot exceed 200 characters")
    .optional(),
});

module.exports = { itemSchema };