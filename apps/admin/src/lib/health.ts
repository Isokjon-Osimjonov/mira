import axios from 'axios'
import { env } from '../config/env'

export async function checkHealth(): Promise<boolean> {
  try {
    await axios.get(`${env.apiUrl}/health`, { timeout: 3000 })
    return true
  } catch {
    return false
  }
}
