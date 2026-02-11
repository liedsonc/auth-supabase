interface ResendEmailConfig {
  apiKey: string;
  from: string;
  fromName?: string;
  appName: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export function createResendEmailService(config: ResendEmailConfig) {
  const { apiKey, from, fromName, appName } = config;

  async function sendEmail(options: EmailOptions): Promise<void> {
    if (!apiKey) {
      console.warn('Resend API key not configured. Email not sent.');
      return;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromName ? `${fromName} <${from}>` : from,
          to: options.to,
          subject: options.subject,
          html: options.html,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Resend API error: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async function sendVerificationEmail(email: string, token: string, baseUrl: string): Promise<void> {
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Verify your email</h1>
        <p>Thank you for signing up for ${appName}!</p>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verificationUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Verify your ${appName} email`,
      html,
    });
  }

  async function sendPasswordResetEmail(email: string, token: string, baseUrl: string): Promise<void> {
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Reset your password</h1>
        <p>You requested to reset your password for ${appName}.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
        <p>Or copy and paste this URL into your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Reset your ${appName} password`,
      html,
    });
  }

  return {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetEmail,
  };
}
