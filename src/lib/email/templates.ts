/**
 * Email Templates for AI School Platform
 */

import { getBaseUrl } from './email-service'

// Common email wrapper
function emailWrapper(content: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { width: 48px; height: 48px; background: #2563eb; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; }
    .logo svg { width: 28px; height: 28px; color: white; }
    h1 { color: #1f2937; font-size: 24px; margin: 0 0 8px 0; }
    .subtitle { color: #6b7280; font-size: 14px; margin: 0; }
    .content { margin: 24px 0; }
    .button { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .button:hover { background: #1d4ed8; }
    .button-secondary { background: #10b981; }
    .button-warning { background: #f59e0b; }
    .info-box { background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-box.warning { background: #fef3c7; border-left: 4px solid #f59e0b; }
    .info-box.success { background: #d1fae5; border-left: 4px solid #10b981; }
    .info-box.error { background: #fee2e2; border-left: 4px solid #ef4444; }
    .footer { text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 12px; }
    .footer a { color: #6b7280; }
    .details { margin: 16px 0; }
    .details dt { font-weight: 600; color: #374151; margin-top: 8px; }
    .details dd { margin: 4px 0 0 0; color: #6b7280; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: white;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
          </svg>
        </div>
        <h1>AI School Platform</h1>
        <p class="subtitle">Empowering Education with AI</p>
      </div>
      ${content}
      <div class="footer">
        <p>© ${new Date().getFullYear()} AI School Platform. All rights reserved.</p>
        <p>This email was sent by AI School Platform.<br>
        If you didn't request this, please ignore this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
`
}

// Email Verification Template
export function emailVerificationTemplate(params: {
  userName: string
  verificationUrl: string
  expiresIn: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      <p>Welcome to AI School Platform! Please verify your email address to complete your registration.</p>
      
      <div style="text-align: center;">
        <a href="${params.verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <div class="info-box warning">
        <strong>⏰ This link expires in ${params.expiresIn}</strong>
        <p style="margin: 8px 0 0 0; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <code style="word-break: break-all;">${params.verificationUrl}</code>
      </p>
    </div>
  `
  return emailWrapper(content, 'Verify Your Email - AI School')
}

// Welcome Email Template (after verification)
export function welcomeEmailTemplate(params: {
  userName: string
  role: string
  loginUrl: string
  schoolName?: string
}): string {
  const roleMessages: Record<string, string> = {
    STUDENT: 'You can now access AI-powered tutoring, practice worksheets, and track your learning progress.',
    TEACHER: 'You can now create AI-generated lesson plans, worksheets, and manage your classes.',
    PARENT: 'You can now monitor your child\'s progress and homework submissions.',
    ADMIN: 'You have full administrative access to manage your school.',
  }

  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      
      <div class="info-box success">
        <strong>🎉 Your email has been verified!</strong>
        <p style="margin: 8px 0 0 0;">Your account is now active.</p>
      </div>
      
      <p>${roleMessages[params.role] || 'Welcome to the platform!'}</p>
      
      ${params.schoolName ? `<p>You are registered with <strong>${params.schoolName}</strong>.</p>` : ''}
      
      <div style="text-align: center;">
        <a href="${params.loginUrl}" class="button button-secondary">Go to Dashboard</a>
      </div>
      
      <h3 style="margin-top: 24px;">Getting Started</h3>
      <ul style="color: #4b5563;">
        <li>Complete your profile settings</li>
        <li>Explore the dashboard features</li>
        <li>Check out our help documentation</li>
      </ul>
    </div>
  `
  return emailWrapper(content, 'Welcome to AI School!')
}

// Teacher Pending Approval Template
export function teacherPendingApprovalTemplate(params: {
  userName: string
  schoolName?: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      
      <div class="info-box warning">
        <strong>⏳ Your account is pending approval</strong>
        <p style="margin: 8px 0 0 0;">Your email has been verified. A school administrator will review your registration.</p>
      </div>
      
      <p>As a teacher, your account requires administrator approval before you can access the platform. This helps ensure the security of our educational environment.</p>
      
      ${params.schoolName ? `<p>School: <strong>${params.schoolName}</strong></p>` : ''}
      
      <p>You will receive an email notification once your account has been reviewed.</p>
      
      <h3 style="margin-top: 24px;">What happens next?</h3>
      <ol style="color: #4b5563;">
        <li>A school administrator will review your registration</li>
        <li>You'll receive an email with the decision</li>
        <li>Once approved, you can log in and start using the platform</li>
      </ol>
    </div>
  `
  return emailWrapper(content, 'Account Pending Approval - AI School')
}

// Teacher Approved Template
export function teacherApprovedTemplate(params: {
  userName: string
  loginUrl: string
  schoolName?: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      
      <div class="info-box success">
        <strong>✅ Your account has been approved!</strong>
        <p style="margin: 8px 0 0 0;">You now have full access to the AI School Platform.</p>
      </div>
      
      ${params.schoolName ? `<p>Welcome to <strong>${params.schoolName}</strong>!</p>` : ''}
      
      <p>You can now:</p>
      <ul style="color: #4b5563;">
        <li>Create AI-generated lesson plans</li>
        <li>Generate practice worksheets</li>
        <li>Assign and grade homework</li>
        <li>Track student progress</li>
        <li>Access teacher training modules</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="${params.loginUrl}" class="button button-secondary">Start Teaching</a>
      </div>
    </div>
  `
  return emailWrapper(content, 'Account Approved - AI School')
}

// Teacher Rejected Template
export function teacherRejectedTemplate(params: {
  userName: string
  reason?: string
  supportEmail: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      
      <div class="info-box error">
        <strong>❌ Your account registration was not approved</strong>
      </div>
      
      ${params.reason ? `
        <p><strong>Reason:</strong></p>
        <p style="color: #6b7280; font-style: italic;">${params.reason}</p>
      ` : ''}
      
      <p>If you believe this was a mistake or would like more information, please contact support:</p>
      
      <div style="text-align: center;">
        <a href="mailto:${params.supportEmail}" class="button button-warning">Contact Support</a>
      </div>
    </div>
  `
  return emailWrapper(content, 'Registration Update - AI School')
}

// Admin Notification: New Teacher Registration
export function adminNewTeacherTemplate(params: {
  adminName: string
  teacherName: string
  teacherEmail: string
  schoolName: string
  approvalUrl: string
  registeredAt: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.adminName}</strong>,</p>
      
      <div class="info-box warning">
        <strong>🔔 New Teacher Registration Requires Approval</strong>
      </div>
      
      <p>A new teacher has registered and is awaiting your approval:</p>
      
      <dl class="details">
        <dt>Name</dt>
        <dd>${params.teacherName}</dd>
        <dt>Email</dt>
        <dd>${params.teacherEmail}</dd>
        <dt>School</dt>
        <dd>${params.schoolName}</dd>
        <dt>Registered</dt>
        <dd>${params.registeredAt}</dd>
      </dl>
      
      <div style="text-align: center;">
        <a href="${params.approvalUrl}" class="button">Review Registration</a>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        Please verify the teacher's identity before approving access to the platform.
      </p>
    </div>
  `
  return emailWrapper(content, 'New Teacher Registration - AI School')
}

// Admin Notification: New Student Registration
export function adminNewStudentTemplate(params: {
  adminName: string
  studentName: string
  studentEmail: string
  schoolName: string
  registeredAt: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.adminName}</strong>,</p>
      
      <div class="info-box">
        <strong>📚 New Student Registration</strong>
      </div>
      
      <p>A new student has registered on the platform:</p>
      
      <dl class="details">
        <dt>Name</dt>
        <dd>${params.studentName}</dd>
        <dt>Email</dt>
        <dd>${params.studentEmail}</dd>
        <dt>School</dt>
        <dd>${params.schoolName}</dd>
        <dt>Registered</dt>
        <dd>${params.registeredAt}</dd>
      </dl>
      
      <p style="font-size: 14px; color: #6b7280;">
        The student's account is now active. You can manage their profile from the admin dashboard.
      </p>
    </div>
  `
  return emailWrapper(content, 'New Student Registration - AI School')
}

// Password Reset Template
export function passwordResetTemplate(params: {
  userName: string
  resetUrl: string
  expiresIn: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      
      <p>We received a request to reset your password. Click the button below to create a new password:</p>
      
      <div style="text-align: center;">
        <a href="${params.resetUrl}" class="button">Reset Password</a>
      </div>
      
      <div class="info-box warning">
        <strong>⏰ This link expires in ${params.expiresIn}</strong>
        <p style="margin: 8px 0 0 0; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
      
      <p style="font-size: 14px; color: #6b7280;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <code style="word-break: break-all;">${params.resetUrl}</code>
      </p>
    </div>
  `
  return emailWrapper(content, 'Reset Your Password - AI School')
}

// Password Changed Confirmation
export function passwordChangedTemplate(params: {
  userName: string
  changedAt: string
  ipAddress?: string
}): string {
  const content = `
    <div class="content">
      <p>Hello <strong>${params.userName}</strong>,</p>
      
      <div class="info-box success">
        <strong>🔐 Your password has been changed</strong>
      </div>
      
      <p>Your password was successfully changed on ${params.changedAt}.</p>
      
      ${params.ipAddress ? `<p style="font-size: 14px; color: #6b7280;">IP Address: ${params.ipAddress}</p>` : ''}
      
      <div class="info-box warning">
        <strong>Didn't make this change?</strong>
        <p style="margin: 8px 0 0 0; font-size: 14px;">If you didn't change your password, please contact support immediately and secure your account.</p>
      </div>
    </div>
  `
  return emailWrapper(content, 'Password Changed - AI School')
}
