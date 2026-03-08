import { z } from "zod";

export const CARD_DOMAINS = [
  "lang",
  "general",
  "med",
  "stem-m",
  "stem-cs",
  "fin",
  "law",
  "arts",
  "skill",
  "mem",
] as const;

export const generateFormSchema = z.object({
  content: z
    .string()
    .min(1, "Content is required")
    .max(102400, "Content exceeds 100KB limit"),
  contentType: z.enum(["text", "prompt"]),
  domain: z.enum(CARD_DOMAINS, { message: "Please select a domain" }),
  hookKey: z.string().optional(),
  cardStyle: z.enum(["basic", "cloze", "mixed"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  maxCards: z.number().int().min(1).max(50),
}).superRefine((data, ctx) => {
  if (data.content.length < 10) {
    ctx.addIssue({
      code: "too_small",
      minimum: 10,
      origin: "string",
      inclusive: true,
      message: data.contentType === "prompt"
        ? "Directive must be at least 10 characters"
        : "Content must be at least 10 characters",
      path: ["content"],
    });
  }
});

export type GenerateFormValues = z.infer<typeof generateFormSchema>;
