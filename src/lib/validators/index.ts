import { z } from 'zod'
import { NextResponse } from 'next/server'

export { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth'
export { createLessonSchema } from './lesson'
export { createWorksheetSchema } from './worksheet'
export { createHomeworkSchema } from './homework'
export { createDiagramSchema } from './diagram'

export type { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from './auth'
export type { CreateLessonInput } from './lesson'
export type { CreateWorksheetInput } from './worksheet'
export type { CreateHomeworkInput } from './homework'
export type { CreateDiagramInput } from './diagram'

/**
 * Validate request body against a Zod schema.
 * Returns parsed data on success, or a 400 NextResponse on failure.
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T } | { error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data }
  } catch (err) {
    if (err instanceof z.ZodError) {
      const messages = err.issues.map((issue) => issue.message)
      return {
        error: NextResponse.json(
          { error: messages[0], details: messages },
          { status: 400 }
        ),
      }
    }
    return {
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      ),
    }
  }
}
