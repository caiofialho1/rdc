import { AuthProvider, useAuth } from './auth/AuthProvider'
import Shell from './components/ui/Shell'
import Login from './screens/Login'

function Conteudo() {
  const { admin } = useAuth()
  if (!admin) return <Login />
  return <Shell />
}

export default function App() {
  return (
    <AuthProvider>
      <Conteudo />
    </AuthProvider>
  )
}
