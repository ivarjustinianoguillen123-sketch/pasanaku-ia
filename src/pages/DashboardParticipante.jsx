import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'

export default function DashboardParticipante({ user, perfil: perfilInicial }) {
  const [tab, setTab] = useState('inicio')
  const [perfil, setPerfil] = useState(perfilInicial)
  const [monto, setMonto] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)

  const hoy = new Date()
  const diaActual = perfil?.diaActual || 1
  const aporte = perfil?.aporte || 300
  const pagos = perfil?.pagos || []
  const totalDias = perfil?.totalDias || 24

  const diff = parseFloat(monto) - aporte
  const diffColor = diff === 0 ? '#27500A' : diff < 0 ? '#854F0B' : '#3C3489'
  const diffText = diff === 0 ? '✓ Monto correcto' : diff < 0 ? `Falta Bs ${Math.abs(diff).toFixed(0)}` : `Excede en Bs ${diff.toFixed(0)}`

  const enviarComprobante = async () => {
    if (!monto) return
    setCargando(true)
    const nuevoPago = { dia: diaActual, monto: parseFloat(monto), fecha: new Date().toISOString() }
    await updateDoc(doc(db, 'participantes', user.uid), { pagos: arrayUnion(nuevoPago) })
    setEnviado(true)
    setCargando(false)
  }

  return (
    <div className="page">
      <div className="top-bar">
        <span style={{ fontSize:22 }}>💰</span>
        <h1>Mi Pasanaku</h1>
        <button onClick={() => auth.signOut()} style={{ background:'rgba(255,255,255,0.15)', color:'#F4C0D1', border:'none', borderRadius:20, padding:'4px 12px', fontSize:12 }}>Salir</button>
      </div>

      {tab === 'inicio' && (
        <div className="content">
          <div className="metric-grid">
            <div className="metric-card">
              <div className="metric-label">Monto a recibir</div>
              <div className="metric-value">Bs {perfil?.monto || '---'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Tu turno</div>
              <div className="metric-value">Día {perfil?.turno || '---'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Pagos realizados</div>
              <div className="metric-value">{pagos.length}/{totalDias}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Aporte diario</div>
              <div className="metric-value">Bs {aporte}</div>
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom:10 }}>Progreso del mes</div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#6B6B6B', marginBottom:6 }}>
              <span>{pagos.length} días pagados</span>
              <span>{Math.round((pagos.length/totalDias)*100)}%</span>
            </div>
            <div className="progress-wrap"><div className="progress-fill" style={{ width:`${(pagos.length/totalDias)*100}%` }} /></div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom:10 }}>Calendario de pagos</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginBottom:8 }}>
              {['L','M','M','J','V','S','D'].map((d,i) => <div key={i} style={{ fontSize:10, color:'#AAA', textAlign:'center' }}>{d}</div>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {Array.from({ length: totalDias }, (_,i) => i+1).map(d => {
                const pagado = pagos.some(p => p.dia === d)
                const esHoy = d === diaActual
                return (
                  <div key={d} style={{
                    aspectRatio:'1', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:11, fontWeight:600,
                    background: pagado ? '#EAF3DE' : esHoy ? '#4B1528' : '#F0EFED',
                    color: pagado ? '#27500A' : esHoy ? '#F4C0D1' : '#BBB'
                  }}>{d}</div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom:12 }}>Subir comprobante — Día {diaActual}</div>
            {!enviado ? (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div className="form-group">
                  <label>Monto depositado (Bs)</label>
                  <input type="number" placeholder={`Ej: ${aporte}`} value={monto} onChange={e => setMonto(e.target.value)} />
                </div>
                {monto && (
                  <div style={{ background:'#F8F6F4', borderRadius:8, padding:10, fontSize:13 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'#6B6B6B' }}>Aporte diario:</span><span style={{ fontWeight:700 }}>Bs {aporte}</span></div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}><span style={{ color:'#6B6B6B' }}>Ingresado:</span><span style={{ fontWeight:700, color:'#4B1528' }}>Bs {monto}</span></div>
                    <div style={{ marginTop:6, fontSize:12, fontWeight:700, color: diffColor }}>{diffText}</div>
                  </div>
                )}
                <div className="upload-box" style={{ padding:18 }}>
                  <div style={{ fontSize:28 }}>📤</div>
                  <div style={{ fontSize:13, marginTop:6 }}>Toca para subir foto del comprobante</div>
                  <div style={{ fontSize:11, color:'#AAA', marginTop:3 }}>QR o transferencia bancaria</div>
                </div>
                <button className="btn-primary" onClick={enviarComprobante} disabled={!monto || cargando}>
                  {cargando ? 'Enviando...' : 'Enviar comprobante'}
                </button>
              </div>
            ) : (
              <div className="alert alert-success" style={{ textAlign:'center', padding:16 }}>
                ✅ Comprobante de <strong>Bs {monto}</strong> enviado.<br/>El administrador fue notificado.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'historial' && (
        <div className="content">
          <div className="card">
            <div className="section-title" style={{ marginBottom:12 }}>Historial de pagos</div>
            {pagos.length === 0 ? (
              <p style={{ fontSize:13, color:'#AAA', textAlign:'center', padding:20 }}>No hay pagos registrados aún</p>
            ) : pagos.map((p, i) => (
              <div key={i} className="row">
                <div className="avatar av-green">D{p.dia}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600 }}>Día {p.dia}</div>
                  <div style={{ fontSize:11, color:'#6B6B6B' }}>{new Date(p.fecha).toLocaleDateString('es-BO')}</div>
                </div>
                <span className="badge badge-ok">Bs {p.monto}</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ background:'#4B1528' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:12, color:'rgba(244,192,209,0.7)' }}>Total pagado hasta hoy</div>
                <div style={{ fontSize:24, fontWeight:700, color:'#F4C0D1', marginTop:4 }}>Bs {pagos.reduce((s,p) => s+p.monto, 0)}</div>
              </div>
              <div style={{ fontSize:36 }}>💰</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'perfil' && (
        <div className="content">
          <div className="card">
            <div style={{ textAlign:'center', padding:'8px 0 16px' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'#4B1528', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, color:'#F4C0D1', margin:'0 auto 12px' }}>
                {perfil?.nombre?.charAt(0) || '?'}
              </div>
              <div style={{ fontSize:18, fontWeight:700 }}>{perfil?.nombre}</div>
              <div style={{ fontSize:13, color:'#6B6B6B', marginTop:4 }}>{perfil?.negocio}</div>
            </div>
            <div className="info-row"><span className="info-key">CI</span><span className="info-val">{perfil?.ci}</span></div>
            <div className="info-row"><span className="info-key">Celular</span><span className="info-val">{perfil?.celular}</span></div>
            <div className="info-row"><span className="info-key">Domicilio</span><span className="info-val" style={{ fontSize:12 }}>{perfil?.domicilio}</span></div>
            <div className="info-row"><span className="info-key">Cuenta</span><span className="info-val" style={{ fontSize:12 }}>{perfil?.cuenta}</span></div>
          </div>
          <button className="btn-secondary" onClick={() => auth.signOut()}>Cerrar sesión</button>
        </div>
      )}

      <div className="bottom-nav">
        {[['🏠','inicio','Inicio'],['📅','historial','Historial'],['👤','perfil','Perfil']].map(([icon,id,label]) => (
          <button key={id} className={`nav-btn ${tab===id?'active':''}`} onClick={() => setTab(id)}>
            <span className="nav-icon">{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}
