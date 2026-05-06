import { useState, useEffect } from 'react'
import { auth, db } from './firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import Login from './pages/Login'
import Registro from './pages/Registro'
import DashboardParticipante from './pages/DashboardParticipante'
import DashboardAdmin from './pages/DashboardAdmin'
import Bienvenida from './pages/Bienvenida'

const ADMIN_EMAIL = 'ivar.justiniano.guillen.123@gmail.com'

export default function App() {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [pantalla, setPantalla] = useState('login')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        if (u.email === ADMIN_EMAIL) {
          setPerfil({ rol: 'admin' })
          setPantalla('admin')
        } else {
          const snap = await getDoc(doc(db, 'participantes', u.uid))
          if (snap.exists()) {
            const data = snap.data()
            setPerfil(data)
            if (!data.aprobado) {
              setPantalla('pendiente')
            } else if (!data.bienvenidaVista) {
              setPantalla('bienvenida')
            } else {
              setPantalla('participante')
            }
          } else {
            setPantalla('registro')
          }
        }
      } else {
        setUser(null)
        setPerfil(null)
        setPantalla('login')
      }
      setCargando(false)
    })
    return unsub
  }, [])

  if (cargando) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
      <div style={{ fontSize:32 }}>💰</div>
      <div className="spinner" />
      <p style={{ color:'#4B1528', fontWeight:600 }}>Pasanaku-IA</p>
    </div>
  )

  if (pantalla === 'login') return <Login onRegistro={() => setPantalla('registro')} />
  if (pantalla === 'registro') return <Registro onVolver={() => setPantalla('login')} />
  if (pantalla === 'pendiente') return (
    <div className="page" style={{ alignItems:'center', justifyContent:'center', padding:32, textAlign:'center', gap:16 }}>
      <div style={{ fontSize:48 }}>⏳</div>
      <h2 style={{ color:'#4B1528' }}>Solicitud enviada</h2>
      <p style={{ color:'#6B6B6B', lineHeight:1.6 }}>Tu registro está siendo revisado por el administrador. Te notificarán cuando sea aprobado.</p>
      <button className="btn-secondary" style={{ marginTop:8 }} onClick={() => { auth.signOut() }}>Cerrar sesión</button>
    </div>
  )
  if (pantalla === 'bienvenida') return <Bienvenida perfil={perfil} onContinuar={() => setPantalla('participante')} />
  if (pantalla === 'participante') return <DashboardParticipante user={user} perfil={perfil} />
  if (pantalla === 'admin') return <DashboardAdmin user={user} />
  return null
}
