import { Navigate } from 'react-router-dom'
export default function Leads() {
  return <Navigate to="/clientes?status=Lead" replace />
}
