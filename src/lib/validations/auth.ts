import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .nonempty({ message: "Email é obrigatório" })
    .email({ message: "Email inválido" })
    .max(254, { message: "Email muito longo" }),
  password: z
    .string()
    .nonempty({ message: "Senha é obrigatória" })
    .min(6, { message: "Senha deve ter no mínimo 6 caracteres" })
    .max(100, { message: "Senha muito longa" }),
});

export type LoginFormData = z.infer<typeof loginSchema>;
