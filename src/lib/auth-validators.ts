import { z } from "zod";

const requiredText = (label: string, min = 2) =>
  z
    .string({ required_error: `${label} ist erforderlich.` })
    .trim()
    .min(min, `${label} ist erforderlich.`)
    .max(500, `${label} ist zu lang.`)
    .transform((value) => value.replace(/[<>]/g, ""));

const optionalShortText = z
  .preprocess((value) => (value === "" || value === null ? undefined : value), z.string().trim().max(255).optional())
  .transform((value) => value?.replace(/[<>]/g, ""));

export const loginSchema = z.object({
  email: z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase(),
  password: z.string().min(1, "Passwort ist erforderlich.")
});

export const registerSchema = z.object({
  companyName: requiredText("Firmenname"),
  name: requiredText("Name"),
  email: z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase(),
  password: z.string().min(10, "Das Passwort muss mindestens 10 Zeichen haben."),
  country: z.string().trim().min(2).max(2).default("DE"),
  contactPhone: optionalShortText
});
