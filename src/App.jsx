import { useState } from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Planning from '@/pages/Planning'
import Skippers from '@/pages/Skippers'
import Techniciens from '@/pages/Techniciens'
import Menage from '@/pages/Menage'
import Bateaux from '@/pages/Bateaux'
import Options from '@/pages/Options'
import Clients from '@/pages/Clients'
import Messagerie from '@/pages/Messagerie'
import FichePublique from '@/pages/FichePublique'
import Login from '@/pages/Login'
import SkipperDashboard from '@/pages/SkipperDashboard'
import TechnicienDashboard from '@/pages/TechnicienDashboard'
import MenageDashboard from '@/pages/MenageDashboard'

function AppWithAuth() {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem('helmo_user')
    return saved ? JSON.parse(saved) : null
  })

  function handleLogin(account) {
    sessionStorage.setItem('helmo_user', JSON.stringify(account))
    setUser(account)
  }

  function handleLogout() {
    sessionStorage.removeItem('helmo_user')
    setUser(null)
  }

  // Vue Skipper
  if (user?.role === 'skipper') {
    return <SkipperDashboard onLogout={handleLogout} />
  }

  // Vue Technicien
  if (user?.role === 'technician') {
    return <TechnicienDashboard onLogout={handleLogout} />
  }

  // Vue Ménage (société tierce sous-traitante)
  if (user?.role === 'menage') {
    return <MenageDashboard onLogout={handleLogout} />
  }

  const router = createBrowserRouter([
    {
      path: '/bateau/:id',
      element: <FichePublique />,
    },
    {
      path: '/login',
      element: user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />,
    },
    {
      path: '/',
      element: user ? <AppLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" replace />,
      children: [
        { index: true, element: <Dashboard /> },
        { path: 'planning', element: <Planning /> },
        { path: 'clients', element: <Clients /> },
        { path: 'skippers', element: <Skippers /> },
        { path: 'techniciens', element: <Techniciens /> },
        { path: 'menage', element: <Menage /> },
        { path: 'bateaux', element: <Bateaux /> },
        { path: 'options', element: <Options /> },
        { path: 'messagerie', element: <Messagerie /> },
      ],
    },
  ])

  return <RouterProvider router={router} />
}

export default AppWithAuth
