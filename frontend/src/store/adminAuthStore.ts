import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import type { SaasAdmin } from '@/types'

interface AdminAuthState {
  session: Session | null
  admin: SaasAdmin | null
  isLoading: boolean
  setSession: (session: Session | null) => void
  setAdmin: (admin: SaasAdmin | null) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      session: null,
      admin: null,
      isLoading: false,

      setSession: (session) => set({ session }),
      setAdmin: (admin) => set({ admin }),
      setLoading: (isLoading) => set({ isLoading }),

      reset: () => set({ session: null, admin: null, isLoading: false }),
    }),
    {
      name: 'minha-otica-admin-auth',
      partialize: (state) => ({ admin: state.admin }),
    },
  ),
)
