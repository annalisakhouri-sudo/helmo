import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/pages/Dashboard'
import Planning from '@/pages/Planning'
import Documents from '@/pages/Documents'
import Skippers from '@/pages/Skippers'
import Techniciens from '@/pages/Techniciens'
import { MesSkippers, Bateaux } from '@/pages/Others'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'planning', element: <Planning /> },
      { path: 'documents', element: <Documents /> },
      { path: 'skippers', element: <Skippers /> },
      { path: 'mes-skippers', element: <MesSkippers /> },
      { path: 'techniciens', element: <Techniciens /> },
      { path: 'bateaux', element: <Bateaux /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
