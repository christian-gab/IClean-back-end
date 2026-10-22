import { Request } from 'express'

export function getAuthenticatedUserId(req: Request): string | undefined {
  const headerUserId = req.headers['x-user-id']
  if (typeof headerUserId === 'string' && headerUserId.trim()) {
    return headerUserId.trim()
  }
  const authHeader = req.headers.authorization
  if (authHeader && typeof authHeader === 'string') {
    const raw = authHeader.replace(/^Bearer\s+/i, '').trim()
    const parts = raw.split('-')
    if (parts.length >= 3 && parts[0] === 'token') {
      try {
        const decoded = Buffer.from(parts[1], 'base64').toString('utf-8')
        if (decoded && decoded.trim()) {
          return decoded.trim()
        }
      } catch {
      }
    }
  }
  if (typeof req.query.userId === 'string' && req.query.userId.trim()) {
    return req.query.userId.trim()
  }

  return undefined
}
