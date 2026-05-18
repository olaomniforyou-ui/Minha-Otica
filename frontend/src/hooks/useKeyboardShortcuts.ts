import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ROUTES: Record<string, string> = {
  'd': '/dashboard',
  'p': '/patients',
  'v': '/sales',
  'o': '/orders',
  'e': '/inventory',
  'f': '/financial',
  'l': '/lab-status',
  'w': '/whatsapp',
  'a': '/analytics',
  'c': '/commissions',
  'h': '/help',
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Alt + letra → navega para módulo
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const target = ROUTES[e.key.toLowerCase()]
        if (target) {
          const active = document.activeElement
          const isInput = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement
          if (!isInput) {
            e.preventDefault()
            navigate(target)
          }
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}

export const SHORTCUT_LIST: { keys: string; action: string; category: string }[] = [
  { keys: 'Alt + D', action: 'Dashboard',          category: 'Navegação' },
  { keys: 'Alt + P', action: 'Pacientes',           category: 'Navegação' },
  { keys: 'Alt + V', action: 'Vendas / PDV',        category: 'Navegação' },
  { keys: 'Alt + O', action: 'Ordens de Serviço',   category: 'Navegação' },
  { keys: 'Alt + E', action: 'Estoque / Produtos',  category: 'Navegação' },
  { keys: 'Alt + F', action: 'Financeiro',          category: 'Navegação' },
  { keys: 'Alt + L', action: 'Laboratório',         category: 'Navegação' },
  { keys: 'Alt + W', action: 'WhatsApp',            category: 'Navegação' },
  { keys: 'Alt + A', action: 'Analytics / BI',      category: 'Navegação' },
  { keys: 'Alt + C', action: 'Comissões',           category: 'Navegação' },
  { keys: 'Alt + H', action: 'Central de Ajuda',    category: 'Navegação' },
  { keys: 'Esc',     action: 'Fechar modal/painel', category: 'Global' },
  { keys: 'Enter',   action: 'Confirmar / Enviar',  category: 'Global' },
]
