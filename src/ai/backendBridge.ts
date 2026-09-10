/**
 * Backend Bridge — ponte com Nexus AI Backend
 */

export async function isNexusAiBackendUp(): Promise<boolean> {
  try {
    const url = import.meta.env.VITE_NEXUS_AI_URL
    if (!url) return false
    
    const res = await fetch(`${url}/health`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}
