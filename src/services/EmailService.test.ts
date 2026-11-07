import assert from 'node:assert/strict'
import { mock, test } from 'node:test'
import { sendVerificationEmail } from './EmailService.js'

test('sends verification email using the configured EmailJS template', async () => {
  const env = {
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }
  const request = { url: '', body: '' }

  process.env.EMAILJS_SERVICE_ID = 'service_test'
  process.env.EMAILJS_TEMPLATE_ID = 'template_test'
  process.env.EMAILJS_PUBLIC_KEY = 'public_test'
  process.env.EMAILJS_PRIVATE_KEY = 'private_test'
  process.env.NODE_ENV = 'production'

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
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

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
    EMAILJS_SERVICE_ID: process.env.EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID: process.env.EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY: process.env.EMAILJS_PUBLIC_KEY,
    EMAILJS_PRIVATE_KEY: process.env.EMAILJS_PRIVATE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }

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
