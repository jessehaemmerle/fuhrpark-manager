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

export const passwordSchema = z
  .string()
  .min(10, "Das Passwort muss mindestens 10 Zeichen haben.")
  .regex(/[a-z]/, "Das Passwort braucht mindestens einen Kleinbuchstaben.")
  .regex(/[A-Z]/, "Das Passwort braucht mindestens einen Grossbuchstaben.")
  .regex(/[0-9]/, "Das Passwort braucht mindestens eine Zahl.");

const passwordConfirmationShape = {
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Bitte Passwort bestaetigen.")
};

export const setPasswordSchema = z
  .object(passwordConfirmationShape)
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwoerter stimmen nicht ueberein.",
    path: ["confirmPassword"]
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase()
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20, "Reset-Link ist ungueltig."),
    ...passwordConfirmationShape
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Die Passwoerter stimmen nicht ueberein.",
    path: ["confirmPassword"]
  });

export const registerSchema = z.object({
  companyName: requiredText("Firmenname"),
  name: requiredText("Name"),
  email: z.string().trim().email("Bitte gueltige E-Mail eingeben.").toLowerCase(),
  password: passwordSchema,
  country: z.string().trim().min(2).max(2).default("DE"),
  contactPhone: optionalShortText
});
