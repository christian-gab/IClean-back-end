import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { NextFunction, Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'

interface CapturedResponse {
  statusCode: number
  body: unknown
  status(code: number): CapturedResponse
  json(body: unknown): CapturedResponse
}

test('reports Gemini overload as a temporary service outage without exposing provider details', () => {
  const response: CapturedResponse = {
    statusCode: 0,
    body: undefined,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
  const error = Object.assign(
    new Error('model overloaded'),
    { status: 503 }
  )

  errorHandler(error, {} as Request, response as unknown as Response, (() => {}) as NextFunction)

  assert.equal(response.statusCode, 503)
  assert.deepEqual(response.body, {
    status: 'error',
    message: 'O serviço de validação está temporariamente em alta demanda. Tente novamente em alguns instantes.',
  })
})
