/**
 * HTTP Client para Nexus AI
 */

const NEXUS_AI_URL = import.meta.env.VITE_NEXUS_AI_URL || 'http://127.0.0.1:8092'
const NEXUS_AI_KEY = import.meta.env.VITE_NEXUS_AI_KEY || 'dev-nexus-ai-key'

export const nexusAiHttp = {
  async post(endpoint: string, payload: any) {
    const res = await fetch(`${NEXUS_AI_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEXUS_AI_KEY}`,
      },
      body: JSON.stringify(payload),
    })
    
    if (!res.ok) {
      throw new Error(`Nexus AI error: ${res.status}`)
    }
    
    return res.json()
  },
}
