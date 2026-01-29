/**
 * Email Service for AI School Platform
 * Supports multiple providers: Resend, SendGrid, SMTP, or Console (dev)
 */

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// Email provider interface
interface EmailProvider {
  send(options: EmailOptions): Promise<EmailResult>
}

// Console provider for development (logs emails)
class ConsoleEmailProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<EmailResult> {
    console.log('\n========== EMAIL (Console Provider) ==========')
    console.log(`To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`)
    console.log(`From: ${options.from || 'noreply@thestai.com'}`)
    console.log(`Subject: ${options.subject}`)
    console.log('--- HTML Content ---')
    console.log(options.html)
    console.log('=================================================\n')
    
    return { success: true, messageId: `console-${Date.now()}` }
  }
}

// Resend provider (recommended for production)
class ResendEmailProvider implements EmailProvider {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || process.env.EMAIL_FROM || 'AI School <noreply@thestai.com>',
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to send email' }
      }

      return { success: true, messageId: data.id }
    } catch (error) {
      console.error('Resend email error:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// SMTP provider using nodemailer-style fetch
class SMTPEmailProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<EmailResult> {
    // For SMTP, we'd typically use nodemailer
    // This is a placeholder - implement based on your SMTP setup
    console.warn('SMTP provider not fully implemented, falling back to console')
    return new ConsoleEmailProvider().send(options)
  }
}

// Get the appropriate email provider based on environment
function getEmailProvider(): EmailProvider {
  const resendKey = process.env.RESEND_API_KEY
  const smtpHost = process.env.SMTP_HOST

  if (resendKey) {
    console.log('Using Resend email provider')
    return new ResendEmailProvider(resendKey)
  }

  if (smtpHost) {
    console.log('Using SMTP email provider')
    return new SMTPEmailProvider()
  }

  // Default to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Using Console email provider (development mode)')
    return new ConsoleEmailProvider()
  }

  console.warn('No email provider configured, using console fallback')
  return new ConsoleEmailProvider()
}

// Singleton provider instance
let emailProvider: EmailProvider | null = null

function getProvider(): EmailProvider {
  if (!emailProvider) {
    emailProvider = getEmailProvider()
  }
  return emailProvider
}

// Main email sending function
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const provider = getProvider()
  return provider.send(options)
}

// Helper to get base URL for email links
export function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}
