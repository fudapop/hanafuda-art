/**
 * Vertex AI Gemini `generateContent` client.
 * Authentication is an access token from Workload Identity Federation, not an API key.
 */

const PROJECT_ID = /^[a-z0-9-]+$/
const LOCATION = /^[a-z0-9-]+$/
const MODEL = /^[a-zA-Z0-9._-]+$/

export class VertexError extends Error {
  readonly status: number

  /**
   * @param status - HTTP status, or 200 when the body had no text.
   * @param message - Short reason safe to print. Must not include the access token.
   */
  constructor(status: number, message: string) {
    super(message)
    this.name = 'VertexError'
    this.status = status
  }
}

/**
 * @param projectId - GCP project id.
 * @param location - Vertex region, or `global`.
 * @param model - Publisher model id, such as `gemini-2.5-flash`.
 * @returns The `generateContent` REST URL.
 * @throws When an input contains characters that would change the URL path.
 */
export const vertexGenerateContentUrl = (
  projectId: string,
  location: string,
  model: string,
): string => {
  if (!PROJECT_ID.test(projectId)) throw new Error('Invalid GCP project id')
  if (!LOCATION.test(location)) throw new Error('Invalid Vertex location')
  if (!MODEL.test(model)) throw new Error('Invalid Vertex model id')
  const resource = `projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`
  if (location === 'global') return `https://aiplatform.googleapis.com/v1/${resource}`
  return `https://${location}-aiplatform.googleapis.com/v1/${resource}`
}

export type VertexRequest = {
  projectId: string
  location: string
  model: string
  accessToken: string
  system: string
  user: string
  fetchImpl?: typeof fetch
}

/**
 * Generate one JSON reply from Vertex AI Gemini.
 *
 * @param request - Project, token, and prompts. The token is sent as a bearer header and is not logged.
 * @returns The concatenated text parts of the first candidate.
 * @throws {VertexError} When the HTTP call fails or the response has no text.
 */
export const vertexGenerate = async (request: VertexRequest): Promise<string> => {
  if (!request.accessToken) throw new VertexError(401, 'GCP access token is empty')
  const fetchImpl = request.fetchImpl ?? fetch
  const response = await fetchImpl(vertexGenerateContentUrl(request.projectId, request.location, request.model), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${request.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: [{ text: request.user }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(120_000),
  })
  const body = await response.text()
  if (!response.ok) {
    throw new VertexError(response.status, `Vertex AI ${response.status}: ${body.slice(0, 400)}`)
  }
  let parsed: {
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>
  }
  try {
    parsed = JSON.parse(body) as typeof parsed
  } catch {
    throw new VertexError(response.status, 'Vertex AI returned non-JSON')
  }
  const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  if (!text.trim()) {
    const reason = parsed.candidates?.[0]?.finishReason ?? 'empty'
    throw new VertexError(200, `Vertex AI returned no text (${reason})`)
  }
  return text
}
