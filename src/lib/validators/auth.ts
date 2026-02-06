import { z } from 'zod'

const passwordRegex = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /\d/,
  special: /[@$!%*?&#^()_+=-]/,
}

export const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .transform((val) => val.replace(/<[^>]*>/g, '').trim()),
  email: z
    .string()
    .email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => passwordRegex.lowercase.test(val), 'Password must contain a lowercase letter')
    .refine((val) => passwordRegex.uppercase.test(val), 'Password must contain an uppercase letter')
    .refine((val) => passwordRegex.digit.test(val), 'Password must contain a digit')
    .refine((val) => passwordRegex.special.test(val), 'Password must contain a special character (@$!%*?&#^()_+=-)'),
  role: z.enum(['TEACHER', 'STUDENT', 'PARENT'], {
    error: 'Role must be TEACHER, STUDENT, or PARENT',
  }),
  languagePreference: z.enum(['ENGLISH', 'HINDI', 'MIXED']).optional().default('ENGLISH'),
  phone: z.string().optional(),
  schoolId: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((val) => passwordRegex.lowercase.test(val), 'Password must contain a lowercase letter')
    .refine((val) => passwordRegex.uppercase.test(val), 'Password must contain an uppercase letter')
    .refine((val) => passwordRegex.digit.test(val), 'Password must contain a digit')
    .refine((val) => passwordRegex.special.test(val), 'Password must contain a special character'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
