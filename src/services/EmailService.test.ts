import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import nodemailer from 'nodemailer'
import { sendVerificationEmail } from './EmailService.js'

test('sends verification email using SMTP when configured', async () => {
  const env = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_FROM: process.env.SMTP_FROM,
    NODE_ENV: process.env.NODE_ENV,
  }

  process.env.SMTP_USER = 'icleaninterprise@gmail.com'
  process.env.SMTP_PASS = 'abcd efgh ijkl mnop'
  process.env.NODE_ENV = 'production'

  let sentMailOptions: nodemailer.SendMailOptions | null = null

  const createTransportMock = mock.method(nodemailer, 'createTransport', () => {
    return {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        sentMailOptions = options
        return { messageId: 'test-msg-123' }
      },
    } as unknown as nodemailer.Transporter
  })

  try {
    await sendVerificationEmail('user@test.com', '654321')

    assert.ok(sentMailOptions)
    assert.equal(sentMailOptions.to, 'user@test.com')
    assert.match(String(sentMailOptions.subject), /654321/)
    assert.match(String(sentMailOptions.text), /654321/)
    assert.match(String(sentMailOptions.html), /654321/)
  } finally {
    createTransportMock.mock.restore()
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('reports SMTP delivery errors', async () => {
  const env = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    NODE_ENV: process.env.NODE_ENV,
  }

  process.env.SMTP_USER = 'icleaninterprise@gmail.com'
  process.env.SMTP_PASS = 'invalid_pass'
  process.env.NODE_ENV = 'production'

  const createTransportMock = mock.method(nodemailer, 'createTransport', () => {
    return {
      sendMail: async () => {
        throw new Error('Invalid login')
      },
    } as unknown as nodemailer.Transporter
  })

  try {
    await assert.rejects(
      sendVerificationEmail('user@test.com', '654321'),
      /Falha ao enviar e-mail via SMTP: Invalid login/
    )
  } finally {
    createTransportMock.mock.restore()
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('sends verification email using the configured EmailJS template', async () => {
  const env = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  process.env.EMAILJS_SERVICE_ID = 'service_test'
  process.env.EMAILJS_TEMPLATE_ID = 'template_test'
  process.env.EMAILJS_PUBLIC_KEY = 'public_test'
  process.env.EMAILJS_PRIVATE_KEY = 'private_test'
  process.env.NODE_ENV = 'production'

  const request = { url: '', body: '' }

  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      request.url = String(input)
      request.body = String(init?.body)
      return new Response('OK', { status: 200 })
    }
  )

  try {
    await sendVerificationEmail('person@example.com', '123456')

    assert.equal(request.url, 'https://api.emailjs.com/api/v1.0/email/send')
    assert.equal(
      request.body,
      JSON.stringify({
        service_id: 'service_test',
        template_id: 'template_test',
        user_id: 'public_test',
        accessToken: 'private_test',
        template_params: {
          to_email: 'person@example.com',
          verification_code: '123456',
        },
      })
    )
  } finally {
    fetchMock.mock.restore()
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('reports EmailJS delivery errors', async () => {
  const env = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  process.env.EMAILJS_SERVICE_ID = 'service_test'
  process.env.EMAILJS_TEMPLATE_ID = 'template_test'
  process.env.EMAILJS_PUBLIC_KEY = 'public_test'
  process.env.EMAILJS_PRIVATE_KEY = 'private_test'
  process.env.NODE_ENV = 'production'

  const fetchMock = mock.method(
    globalThis,
    'fetch',
    async (): Promise<Response> => new Response('Invalid template', { status: 400 })
  )

  try {
    await assert.rejects(
      sendVerificationEmail('person@example.com', '123456'),
      /Falha ao enviar e-mail via EmailJS/
    )
  } finally {
    fetchMock.mock.restore()
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('requires EmailJS configuration in production', async () => {
  const env = {
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

  delete process.env.SMTP_USER
  delete process.env.SMTP_PASS
  delete process.env.EMAILJS_SERVICE_ID
  delete process.env.EMAILJS_TEMPLATE_ID
  delete process.env.EMAILJS_PUBLIC_KEY
  delete process.env.EMAILJS_PRIVATE_KEY
  process.env.NODE_ENV = 'production'

  try {
    await assert.rejects(
      sendVerificationEmail('person@example.com', '123456'),
      /EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, EMAILJS_PRIVATE_KEY/
    )
  } finally {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
