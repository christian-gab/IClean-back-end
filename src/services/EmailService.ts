import nodemailer from 'nodemailer'
import { AppError } from '../errors/AppError.js'

function getCredentials() {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const from = process.env.SMTP_FROM?.trim() || user

  const isConfigured = Boolean(
    user &&
    user !== 'seu_email@gmail.com' &&
    pass &&
    pass !== 'sua_senha_de_app_aqui'
  )

  return { user, pass, from, isConfigured }
}

function createTransporter() {
  const { user, pass, isConfigured } = getCredentials()
  if (!isConfigured) return null

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL direto na porta 465 (muito mais confiavel em nuvem que porta 587)
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
}

/** Gera código numérico de 6 dígitos. */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

/** Envia o e-mail de verificação com o código. */
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  const { isConfigured, from } = getCredentials()
  const transporter = createTransporter()

  if (!transporter || !isConfigured) {
    if (process.env.NODE_ENV === 'production') {
      throw new AppError(
        'Serviço de e-mail não configurado no servidor de produção (verifique SMTP_USER e SMTP_PASS).',
        500
      )
    }
    // Modo dev: exibe o código no console em vez de enviar email
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📧 [EmailService - DEV MODE (Sem credenciais reais)]`)
    console.log(`   Para: ${to}`)
    console.log(`   Código: ${code}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
    return
  }

  try {
    const info = await transporter.sendMail({
      from: `"IClean" <${from}>`,
      to,
      subject: 'Seu código de verificação — IClean',
      text: `Seu código de verificação é: ${code}\n\nEle expira em 10 minutos. Se você não solicitou isso, ignore este e-mail.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="display: inline-flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 700; color: #15803d;">
              🌱 IClean
            </span>
          </div>
          <div style="background: white; border-radius: 10px; padding: 32px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
            <h2 style="margin: 0 0 8px; font-size: 20px; color: #111827;">Verificação de e-mail</h2>
            <p style="margin: 0 0 24px; color: #6b7280; font-size: 14px; line-height: 1.5;">
              Use o código abaixo para confirmar seu e-mail e criar sua conta no IClean.
            </p>
            <div style="display: inline-block; background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 16px 32px; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 10px; color: #15803d;">${code}</span>
            </div>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              Expira em <strong>10 minutos</strong>. Se você não solicitou isso, ignore este e-mail.
            </p>
          </div>
        </div>
      `,
    })
    console.log(`[EmailService] E-mail de verificação enviado com sucesso para ${to}. MessageId: ${info.messageId}`)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)

    // Erro de autenticação SMTP (senha de app inválida / não configurada)
    if (message.includes('535') || message.includes('BadCredentials') || message.includes('Invalid login')) {
      throw new AppError(
        'Falha ao enviar o e-mail de verificação: credenciais SMTP inválidas. ' +
        'Configure SMTP_USER e SMTP_PASS com uma senha de app do Gmail no .env.',
        500
      )
    }

    // Outros erros SMTP
    throw new AppError(`Falha ao enviar o e-mail de verificação: ${message}`, 500)
  }
}

