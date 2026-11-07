import { createHmac, timingSafeEqual } from 'node:crypto'
import { Request } from 'express'
import { config } from '../config/env.js'

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60

function sign(value: string): Buffer {
  return createHmac('sha256', config.authSecret).update(value).digest()
}

export function createAuthToken(userId: string): string {
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  })).toString('base64url')
  const unsignedToken = `${header}.${payload}`
  const signature = sign(unsignedToken).toString('base64url')

  return `${unsignedToken}.${signature}`
}

function getUserIdFromToken(token: string): string | undefined {
  const [header, payload, encodedSignature, ...extraParts] = token.split('.')
  if (!header || !payload || !encodedSignature || extraParts.length > 0) {
    return undefined
  }

  const unsignedToken = `${header}.${payload}`
  const actualSignature = Buffer.from(encodedSignature, 'base64url')
  const expectedSignature = sign(unsignedToken)
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return undefined
  }

  let tokenHeader: unknown
  let tokenPayload: unknown
  try {
    tokenHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'))
    tokenPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      return undefined
    }
    throw error
  }

  if (
    typeof tokenHeader !== 'object' ||
    tokenHeader === null ||
    !('alg' in tokenHeader) ||
    tokenHeader.alg !== 'HS256' ||
    typeof tokenPayload !== 'object' ||
    tokenPayload === null ||
    !('sub' in tokenPayload) ||
    typeof tokenPayload.sub !== 'string' ||
    tokenPayload.sub.length === 0 ||
    !('iat' in tokenPayload) ||
    typeof tokenPayload.iat !== 'number' ||
    !('exp' in tokenPayload) ||
    typeof tokenPayload.exp !== 'number'
  ) {
    return undefined
  }

  const now = Math.floor(Date.now() / 1000)
  if (tokenPayload.exp <= now || tokenPayload.iat > now + 60) {
    return undefined
  }

  return tokenPayload.sub
}

export function getAuthenticatedUserId(req: Request): string | undefined {
  const authorization = req.headers.authorization
  if (typeof authorization !== 'string') {
    return undefined
  }

  const match = /^Bearer ([^\s]+)$/i.exec(authorization.trim())
  return match ? getUserIdFromToken(match[1]) : undefined
}
