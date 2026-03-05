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
    .min(10, "Content must be at least 10 characters")
    .max(102400, "Content exceeds 100KB limit"),
  domain: z.enum(CARD_DOMAINS, { message: "Please select a domain" }),
  hookKey: z.string().optional(),
  cardStyle: z.enum(["basic", "cloze", "mixed"]),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  maxCards: z.number().int().min(1).max(50),
  sourceLanguage: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, "Invalid language code").optional().or(z.literal("")),
  outputLanguage: z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, "Invalid language code").optional().or(z.literal("")),
});

export type GenerateFormValues = z.infer<typeof generateFormSchema>;
