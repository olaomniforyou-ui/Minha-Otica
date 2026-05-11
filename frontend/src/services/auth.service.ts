import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useAdminAuthStore } from '@/store/adminAuthStore'
import type { Profile } from '@/types'

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)

  const [profileRes, adminRes] = await Promise.allSettled([
    fetchProfiles(data.user.id),
    supabase.from('saas_admins').select('*').eq('id', data.user.id).maybeSingle(),
  ])

  const profiles = profileRes.status === 'fulfilled' ? profileRes.value : []
  const adminRow = adminRes.status  === 'fulfilled' ? adminRes.value.data  : null

  if (profiles.length === 0 && !adminRow) {
    await supabase.auth.signOut()
    throw new Error('Conta não configurada. Contate o administrador.')
  }

  // Limpa dados de admin antigos (de sessão anterior persistida no localStorage)
  useAdminAuthStore.getState().reset()

  const store = useAuthStore.getState()
  store.setSession(data.session)
  store.setAvailableProfiles(profiles)

  if (profiles.length === 1) {
    const p = profiles[0]
    store.setProfile(p)
    if (p.company) store.setCompany(p.company)
  } else if (profiles.length > 1) {
    // Se houver múltiplos, deixamos o usuário escolher depois (ou pega o primeiro por enquanto)
    const p = profiles[0]
    store.setProfile(p)
    if (p.company) store.setCompany(p.company)
  }
  if (adminRow) {
    const adminStore = useAdminAuthStore.getState()
    adminStore.setSession(data.session)
    adminStore.setAdmin(adminRow)
  }

  return { session: data.session, profile: profiles[0], isAdmin: !!adminRow }
}

export async function signOut() {
  await supabase.auth.signOut()
  useAuthStore.getState().reset()
  useAdminAuthStore.getState().reset()
}

export async function fetchProfiles(userId: string): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*, company:companies(*)')
    .eq('id', userId)
  return (data as Profile[]) || []
}

export async function initAuth() {
  const store = useAuthStore.getState()
  store.setLoading(true)

  const { data: { session } } = await supabase.auth.getSession()

  if (session?.user) {
    store.setSession(session)
    const [profilesRes, adminRes] = await Promise.allSettled([
      fetchProfiles(session.user.id),
      supabase.from('saas_admins').select('*').eq('id', session.user.id).maybeSingle(),
    ])

    if (profilesRes.status === 'fulfilled') {
      const profiles = profilesRes.value
      store.setAvailableProfiles(profiles)
      
      // Se já temos um perfil selecionado no store (persistido), mantemos.
      // Caso contrário, se só houver um, selecionamos ele.
      if (!store.profile && profiles.length === 1) {
        const p = profiles[0]
        store.setProfile(p)
        if (p.company) store.setCompany(p.company)
      }
    }
    if (adminRes.status === 'fulfilled' && adminRes.value.data) {
      const adminStore = useAdminAuthStore.getState()
      adminStore.setSession(session)
      adminStore.setAdmin(adminRes.value.data)
    } else {
      useAdminAuthStore.getState().reset()
    }
  }

  store.setLoading(false)

  // O handler NÃO gerencia SIGNED_IN — isso é responsabilidade de signIn/adminSignIn.
  // Só trata SIGNED_OUT (outra aba) e TOKEN_REFRESHED.
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      useAuthStore.getState().reset()
      useAdminAuthStore.getState().reset()
    }
    if (event === 'TOKEN_REFRESHED' && session) {
      useAuthStore.getState().setSession(session)
    }
  })
}

export async function updateProfile(userId: string, data: Partial<Profile>) {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', userId)

  if (error) throw new Error(error.message)

  const updated = await fetchProfiles(userId)
  if (updated.length > 0) {
    // Atualiza apenas o perfil ativo no store
    const active = useAuthStore.getState().profile
    const updatedActive = updated.find(p => p.company_id === active?.company_id)
    if (updatedActive) useAuthStore.getState().setProfile(updatedActive)
    useAuthStore.getState().setAvailableProfiles(updated)
  }
  return updated[0] || null
}
