import { useState } from 'react'
import { auth } from '../firebase/config'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default function Login({ onRegistro }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setCargando(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError('Correo o contraseña incorrectos')
    }
    setCargando(false)
  }

  return (
    <div className="page" style={{ background: 'linear-gradient(160deg, #4B1528 0%, #2D0D18 100%)', justifyContent:'center' }}>
      <div style={{ padding: 32, display:'flex', flexDirection:'column', gap:24 }}>
        <div style={{ textAlign:'center', marginBottom:8 }}>
          <div style={{ fontSize:52, marginBottom:12 }}>💰</div>
          <h1 style={{ color:'#F4C0D1', fontSize:28, fontWeight:700 }}>Pasanaku-IA</h1>
          <p style={{ color:'rgba(244,192,209,0.7)', fontSize:14, marginTop:6 }}>Sistema de ahorro colectivo digital</p>
        </div>

        <div className="card" style={{ gap:14, display:'flex', flexDirection:'column' }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#4B1528' }}>Iniciar sesión</h2>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input type="email" placeholder="tucorreo@gmail.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button className="btn-primary" type="submit" disabled={cargando} style={{ marginTop:4 }}>
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <div style={{ textAlign:'center' }}>
          <p style={{ color:'rgba(244,192,209,0.7)', fontSize:14 }}>¿No tienes cuenta?</p>
          <button onClick={onRegistro} style={{ background:'none', color:'#F4C0D1', fontSize:15, fontWeight:700, marginTop:6, border:'none', textDecoration:'underline' }}>
            Registrarme al Pasanaku
          </button>
        </div>
      </div>
    </div>
  )
}
