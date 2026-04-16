import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyIdentity from './pages/VerifyIdentity'
import Extension4868 from './pages/Extension4868'
import TaxFiling1040 from './pages/TaxFiling1040'
import LoanApplication from './pages/LoanApplication'
import Dashboard from './pages/Dashboard'
import { useAuthStore } from './store/authStore'

export default function App() {
  const { i18n } = useTranslation()
  const { token } = useAuthStore()

  // Detect site from hostname
  const host = window.location.hostname
  const site = host.startsWith('fileextension') ? 'extension'
    : host.startsWith('taxfiling') ? 'filing'
    : host.startsWith('loan') ? 'loan'
    : 'extension' // default for local dev

  return (
    <Layout site={site}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={token ? <VerifyIdentity /> : <Navigate to="/login" />} />
        <Route path="/dashboard" element={token ? <Dashboard site={site} /> : <Navigate to="/login" />} />
        <Route path="/extension" element={token ? <Extension4868 /> : <Navigate to="/login" />} />
        <Route path="/filing" element={token ? <TaxFiling1040 /> : <Navigate to="/login" />} />
        <Route path="/loan" element={token ? <LoanApplication /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
      </Routes>
    </Layout>
  )
}
