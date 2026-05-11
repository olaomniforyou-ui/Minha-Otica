import { Navigate } from 'react-router-dom'

// Página removida — login unificado em /login
export default function AdminLogin() {
  return <Navigate to="/login" replace />
}
