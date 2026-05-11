import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import type { Profile, Company } from '@/types'

interface AuthState {
  session: Session | null
  profile: Profile | null
  company: Company | null
  availableProfiles: Profile[]
  isLoading: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setCompany: (company: Company | null) => void
  setAvailableProfiles: (profiles: Profile[]) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      company: null,
      availableProfiles: [],
      isLoading: false,

      setSession: (session) => set({ session }),
      setProfile: (profile) => set({ profile }),
      setCompany: (company) => set({ company }),
      setAvailableProfiles: (availableProfiles) => set({ availableProfiles }),
      setLoading: (isLoading) => set({ isLoading }),

      reset: () =>
        set({ session: null, profile: null, company: null, availableProfiles: [], isLoading: false }),
    }),
    {
      name: 'minha-otica-auth',
      partialize: (state) => ({
        profile: state.profile,
        company: state.company,
        availableProfiles: state.availableProfiles,
      }),
    },
  ),
)
