import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/ui/Spinner'
import { useAuthStore } from '@/store/authStore'
import { initAuth } from '@/services/auth.service'
import { startSyncScheduler, refreshPendingCount } from '@/services/sync.service'

import Login      from '@/pages/Login'
import Register   from '@/pages/Register'
import Dashboard  from '@/pages/Dashboard'
import PatientsPage  from '@/pages/Patients'
import SalesPage     from '@/pages/Sales'
import ProductsPage  from '@/pages/Inventory'
import SuppliersPage from '@/pages/Suppliers'
import StockPage     from '@/pages/Stock'
import OrdersPage    from '@/pages/Orders'
import LabStatusPage from '@/pages/LabStatus'
import AnalyticsPage  from '@/pages/Analytics'
import EmployeesPage  from '@/pages/Employees'
import FinancialPage  from '@/pages/Financial'

import { AdminLayout } from '@/components/admin-layout/AdminLayout'
import AdminDashboard from '@/pages/Admin/AdminDashboard'
import AdminCompanies from '@/pages/Admin/Companies'
import CompanyDetail  from '@/pages/Admin/CompanyDetail'
import AdminPlans     from '@/pages/Admin/Plans'
import AdminUsers     from '@/pages/Admin/Users'
import AdminRevenue   from '@/pages/Admin/Revenue'
import AdminProfile   from '@/pages/Admin/AdminProfile'
import ProfilePage    from '@/pages/Profile'
import SelectCompany from '@/pages/SelectCompany'
import DeveloperDashboard from '@/pages/DeveloperDashboard'
import { useAdminAuthStore } from '@/store/adminAuthStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 min
      refetchOnWindowFocus: false, // Desativar atualização automática ao voltar para a aba
    },
  },
})

// ── Guard de rota autenticada ─────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, company, isLoading } = useAuthStore()
  const { admin } = useAdminAuthStore()
  const isSelecting = window.location.pathname === '/select-company'

  if (isLoading) return <PageLoader />
  if (!session)  return <Navigate to="/login" replace />

  // Super admins são redirecionados para o painel administrativo
  if (admin) return <Navigate to="/admin" replace />

  // Se tem sessão mas não selecionou empresa (e não está na tela de seleção), vai para a seleção
  if (!company && !isSelecting) return <Navigate to="/select-company" replace />

  return <>{children}</>
}

// ── Guard para redirecionar usuário já logado ─────────────────
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuthStore()
  const { admin } = useAdminAuthStore()
  if (isLoading) return <PageLoader />
  if (session && admin) return <Navigate to="/admin" replace />
  if (session)          return <Navigate to="/" replace />
  return <>{children}</>
}

// ── Guard de rota admin ──────────────────────────────────────
function RequireAdminAuth({ children }: { children: React.ReactNode }) {
  const { admin } = useAdminAuthStore()
  const { isLoading } = useAuthStore()

  if (isLoading) return <PageLoader />

  if (!admin) return <Navigate to="/login" replace />

  return <>{children}</>
}

export default function App() {
  useEffect(() => {
    initAuth()
    startSyncScheduler()
    refreshPendingCount()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Rotas públicas */}
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />
          <Route path="/developer" element={<DeveloperDashboard />} />

          <Route
            path="/select-company"
            element={
              <RequireAuth>
                <SelectCompany />
              </RequireAuth>
            }
          />

          {/* Rotas protegidas */}
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index             element={<Dashboard />} />
            <Route path="sales"      element={<SalesPage />} />
            <Route path="patients"   element={<PatientsPage />} />
            <Route path="products"   element={<ProductsPage />} />
            <Route path="suppliers"  element={<SuppliersPage />} />
            <Route path="stock"      element={<StockPage />} />
            <Route path="orders"     element={<OrdersPage />} />
            <Route path="lab"        element={<LabStatusPage />} />
            <Route path="analytics"  element={<AnalyticsPage />} />
            <Route path="financial"  element={<FinancialPage />} />
            <Route path="employees"  element={<EmployeesPage />} />
            <Route path="profile"    element={<ProfilePage />} />
          </Route>

          {/* Rotas Admin */}
          <Route
            path="/admin"
            element={
              <RequireAdminAuth>
                <AdminLayout />
              </RequireAdminAuth>
            }
          >
            <Route index                element={<AdminDashboard />} />
            <Route path="companies"     element={<AdminCompanies />} />
            <Route path="companies/:id" element={<CompanyDetail />} />
            <Route path="plans"         element={<AdminPlans />} />
            <Route path="users"         element={<AdminUsers />} />
            <Route path="revenue"       element={<AdminRevenue />} />
            <Route path="profile"       element={<AdminProfile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
