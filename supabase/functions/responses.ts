import { corsHeaders } from './cors.ts'

const createResponse = (data: unknown, status: number) =>
  new Response(data ? JSON.stringify(data) : null, {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })

const success = (message = 'success', status: 200 | 201 | 202 = 200) =>
  createResponse({ message }, status)

const withData = (data: unknown, status: 200 | 201 = 200) => createResponse(data, status)

const noContent = () => createResponse(null, 204)

const badRequest = (message = 'Bad request') => createResponse({ error: message }, 400)

const unauthorized = (message = 'Not authorized') => createResponse({ error: message }, 401)

const notFound = (message = 'Resource not found') => createResponse({ error: message }, 404)

const forbidden = (message = 'Forbidden') => createResponse({ error: message }, 403)

const methodNotAllowed = (message = 'Method not allowed') => createResponse({ error: message }, 405)

const serverError = (message = 'Internal server error') => createResponse({ error: message }, 500)

const withError = (error: unknown, status: number) => {
  const message = error instanceof Error ? error.message : error
  return createResponse({ error: message }, status)
}

export {
  badRequest,
  createResponse,
  forbidden,
  methodNotAllowed,
  noContent,
  notFound,
  serverError,
  success,
  unauthorized,
  withData,
  withError,
}
