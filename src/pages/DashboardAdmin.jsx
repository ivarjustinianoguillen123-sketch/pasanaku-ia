import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'

const WHATSAPP = (cel, msg) => `https://wa.me/${cel.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`

export default function DashboardAdmin() {
  const [tab, setTab] = useState('panel')
  const [participantes, setParticipantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [turno, setTurno] = useState('')
  const [aporte, setAporte] = useState('')
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    const snap = await getDocs(collection(db, 'participantes'))
    setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setCargando(false)
  }

  const aprobar = async () => {
    if (!turno || !aporte || !monto) return
    setGuardando(true)
    await updateDoc(doc(db, 'participantes', seleccionado.id), {
      aprobado: true, turno: parseInt(turno), aporte: parseFloat(aporte),
      monto: parseFloat(monto), fechaTransferencia: fecha,
      diaActual: 1, totalDias: 24, bienvenidaVista: false
    })
    await cargar()
    setSeleccionado(null)
    setGuardando(false)
  }

  const rechazar = async () => {
    await updateDoc(doc(db, 'participantes', seleccionado.id), { rechazado: true })
    await cargar()
    setSeleccionado(null)
  }

  const pendientes = participantes.filter(p => !p.aprobado && !p.rechazado)
  const aprobados = participantes.filter(p => p.aprobado)
  const rechazados = participantes.filter(p => p.rechazado)

  const lista = filtro === 'todos' ? participantes : filtro === 'pendiente' ? pendientes : filtro === 'aprobado' ? aprobados : rechazados

  const totalRecaudado = aprobados.reduce((s,p) => s + (p.pagos||[]).reduce((ss,pg) => ss+pg.monto, 0), 0)
  const pagosHoy = aprobados.filter(p => (p.pagos||[]).some(pg => pg.dia === p.diaActual)).length

  if (seleccionado) return (
    <div className="page">
      <div className="top-bar">
        <button onClick={() => setSeleccionado(null)} style={{ background:'none', color:'#F4C0D1', border:'none', fontSize:22 }}>←</button>
        <h1>Perfil participante</h1>
      </div>
      <div className="content">
        <div style={{ background:'#4B1528', borderRadius:14, padding:16, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:52, height:52, borderRadius:'50%', background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'#F4C0D1', fontWeight:700 }}>
            {seleccionado.nombre?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize:17, fontWeight:700, color:'#F4C0D1' }}>{seleccionado.nombre}</div>
            <div style={{ fontSize:12, color:'rgba(244,192,209,0.75)', marginTop:2 }}>{seleccionado.negocio} · {seleccionado.email}</div>
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom:10 }}>Datos personales</div>
          <div className="info-row"><span className="info-key">CI</span><span className="info-val">{seleccionado.ci}</span></div>
          <div className="info-row"><span className="info-key">Celular</span><span className="info-val">{seleccionado.celular}</span></div>
          <div className="info-row"><span className="info-key">Domicilio</span><span className="info-val" style={{ fontSize:12 }}>{seleccionado.domicilio}</span></div>
          <div className="info-row"><span className="info-key">Cuenta</span><span className="info-val" style={{ fontSize:12 }}>{seleccionado.cuenta}</span></div>
          <div className="info-row"><span className="info-key">Fecha nac.</span><span className="info-val">{seleccionado.fechaNac}</span></div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom:10 }}>Documentos — toca para ver</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['🪪','CI anverso','#EEEDFE'],['🪪','CI reverso','#EEEDFE'],['🤳','Selfie con CI','#E1F5EE'],['🏪','Foto exterior','#FAEEDA']].map(([icon,label,bg],i) => (
              <div key={i} style={{ border:'1px solid #EEE', borderRadius:8, overflow:'hidden', cursor:'pointer' }}>
                <div style={{ background:bg, height:60, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>{icon}</div>
                <div style={{ padding:'6px 8px', fontSize:11, color:'#6B6B6B', fontWeight:600 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {!seleccionado.aprobado && !seleccionado.rechazado && (
          <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div className="section-title">Asignar al aprobar</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div className="form-group"><label>Turno (día)</label><input type="number" placeholder="18" value={turno} onChange={e=>setTurno(e.target.value)} /></div>
              <div className="form-group"><label>Aporte diario (Bs)</label><input type="number" placeholder="300" value={aporte} onChange={e=>setAporte(e.target.value)} /></div>
            </div>
            <div className="form-group"><label>Monto total a recibir (Bs)</label><input type="number" placeholder="7200" value={monto} onChange={e=>setMonto(e.target.value)} /></div>
            <div className="form-group"><label>Fecha de transferencia</label><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} /></div>
            <button className="btn-primary" style={{ background:'#27500A' }} disabled={guardando} onClick={aprobar}>{guardando ? 'Aprobando...' : '✅ Aprobar participante'}</button>
            <button style={{ background:'none', color:'#791F1F', border:'1.5px solid #F09595', borderRadius:12, padding:12, fontSize:14, fontWeight:700 }} onClick={rechazar}>Rechazar solicitud</button>
          </div>
        )}

        {seleccionado.aprobado && (
          <div style={{ background:'#EAF3DE', borderRadius:12, padding:14, textAlign:'center', border:'1px solid #C0DD97' }}>
            <div style={{ fontSize:15, fontWeight:700, color:'#27500A' }}>✅ Participante aprobado</div>
            <div style={{ fontSize:13, color:'#3B6D11', marginTop:4 }}>Turno día {seleccionado.turno} · Bs {seleccionado.aporte}/día · Recibirá Bs {seleccionado.monto}</div>
          </div>
        )}

        <button style={{ background:'#25D366', color:'white', border:'none', borderRadius:12, padding:14, fontSize:14, fontWeight:700, width:'100%' }}
          onClick={() => window.open(WHATSAPP(seleccionado.celular, `Hola ${seleccionado.nombre}, te contactamos del Pasanaku-IA.`))}>
          📲 Contactar por WhatsApp
        </button>

        {seleccionado.aprobado && (
          <div className="card">
            <div className="section-title" style={{ marginBottom:10 }}>Historial de pagos</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:4 }}>
              {Array.from({ length: seleccionado.totalDias||24 }, (_,i) => i+1).map(d => {
                const pagado = (seleccionado.pagos||[]).find(p => p.dia === d)
                return (
                  <div key={d} title={pagado ? `Bs ${pagado.monto}` : 'Pendiente'} style={{
                    borderRadius:6, padding:'5px 2px', textAlign:'center', fontSize:10, fontWeight:700,
                    background: pagado ? '#EAF3DE' : '#F0EFED',
                    color: pagado ? '#27500A' : '#BBB'
                  }}>
                    D{d}<br/><span style={{ fontSize:9 }}>{pagado ? `Bs${pagado.monto}` : '---'}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #EEE', display:'flex', justifyContent:'space-between' }}>
              <div style={{ fontSize:13, color:'#6B6B6B' }}>Total pagado</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#27500A' }}>Bs {(seleccionado.pagos||[]).reduce((s,p)=>s+p.monto,0)}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="top-bar">
        <span style={{ fontSize:22 }}>💰</span>
        <h1>{tab === 'panel' ? 'Panel Admin' : tab === 'participantes' ? 'Participantes' : 'Comprobantes'}</h1>
        <button onClick={() => auth.signOut()} style={{ background:'rgba(255,255,255,0.15)', color:'#F4C0D1', border:'none', borderRadius:20, padding:'4px 12px', fontSize:12 }}>Salir</button>
      </div>

      {tab === 'panel' && (
        <div className="content">
          <div style={{ background:'#4B1528', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:12, color:'rgba(244,192,209,0.7)', marginBottom:4 }}>Total recaudado del grupo</div>
            <div style={{ fontSize:28, fontWeight:700, color:'#F4C0D1' }}>Bs {totalRecaudado.toLocaleString()}</div>
            <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:20, height:6, marginTop:10 }}>
              <div style={{ background:'#C0DD97', width:'75%', height:'100%', borderRadius:20 }} />
            </div>
          </div>
          <div className="metric-grid">
            <div className="metric-card"><div className="metric-label">Participantes</div><div className="metric-value">{participantes.length}</div></div>
            <div className="metric-card"><div className="metric-label">Pagaron hoy</div><div className="metric-value">{pagosHoy}/{aprobados.length}</div></div>
            <div className="metric-card"><div className="metric-label">Pendientes</div><div className="metric-value" style={{ color:'#854F0B' }}>{pendientes.length}</div></div>
            <div className="metric-card"><div className="metric-label">Aprobados</div><div className="metric-value" style={{ color:'#27500A' }}>{aprobados.length}</div></div>
          </div>

          {pendientes.length > 0 && (
            <div className="card" style={{ border:'2px solid #FAEEDA' }}>
              <div className="section-title" style={{ color:'#854F0B', marginBottom:10 }}>Solicitudes pendientes ({pendientes.length})</div>
              {pendientes.slice(0,3).map(p => (
                <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor:'pointer' }}>
                  <div className="avatar av-amber">{p.nombre?.charAt(0)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{p.nombre}</div>
                    <div style={{ fontSize:11, color:'#6B6B6B' }}>{p.negocio} · {p.celular}</div>
                  </div>
                  <span className="badge badge-warn">Revisar →</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="section-title" style={{ marginBottom:10 }}>Semáforo de riesgo</div>
            <div style={{ display:'flex', borderRadius:8, overflow:'hidden', height:10, marginBottom:8 }}>
              <div style={{ background:'#97C459', flex: aprobados.length }} />
              <div style={{ background:'#EF9F27', flex: Math.max(1, Math.floor(aprobados.length*0.1)) }} />
              <div style={{ background:'#E24B4A', flex: Math.max(0, pendientes.length) }} />
            </div>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              {[['#97C459','Al día',aprobados.length],['#EF9F27','1 día sin pagar',0],['#E24B4A','2+ días sin pagar',0]].map(([c,l,n]) => (
                <div key={l} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6B6B6B' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:c }} />{l} ({n})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'participantes' && (
        <div className="content">
          <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
            {[['todos','Todos'],['pendiente','Pendientes'],['aprobado','Aprobados'],['rechazado','Rechazados']].map(([id,label]) => (
              <button key={id} onClick={() => setFiltro(id)} style={{
                padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:600, whiteSpace:'nowrap', border:'1px solid #EEE',
                background: filtro===id ? '#4B1528' : 'white', color: filtro===id ? '#F4C0D1' : '#6B6B6B'
              }}>{label}</button>
            ))}
          </div>

          {cargando ? <div className="spinner" /> : (
            <div className="card">
              {lista.length === 0 ? <p style={{ fontSize:13, color:'#AAA', textAlign:'center', padding:20 }}>Sin resultados</p> :
                lista.map(p => (
                  <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor:'pointer' }}>
                    <div className={`avatar ${p.aprobado ? 'av-green' : p.rechazado ? 'av-red' : 'av-amber'}`}>{p.nombre?.charAt(0)}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:600 }}>{p.nombre}</div>
                      <div style={{ fontSize:11, color:'#6B6B6B' }}>{p.negocio} · {p.ci}</div>
                      {p.aprobado && <div style={{ fontSize:11, color:'#27500A', marginTop:2 }}>Turno día {p.turno} · Bs {p.aporte}/día</div>}
                    </div>
                    <span className={`badge ${p.aprobado ? 'badge-ok' : p.rechazado ? 'badge-danger' : 'badge-warn'}`}>
                      {p.aprobado ? 'Aprobado' : p.rechazado ? 'Rechazado' : 'Pendiente'}
                    </span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {tab === 'comprobantes' && (
        <div className="content">
          <div className="card" style={{ background:'#4B1528' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:12, color:'rgba(244,192,209,0.7)' }}>Total general recaudado</div>
                <div style={{ fontSize:22, fontWeight:700, color:'#F4C0D1', marginTop:4 }}>Bs {totalRecaudado.toLocaleString()}</div>
              </div>
              <div style={{ fontSize:36 }}>📊</div>
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom:10 }}>Resumen por participante</div>
            {aprobados.map(p => {
              const total = (p.pagos||[]).reduce((s,pg) => s+pg.monto, 0)
              const pct = Math.round((p.pagos||[]).length / (p.totalDias||24) * 100)
              return (
                <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor:'pointer' }}>
                  <div className="avatar av-green">{p.nombre?.charAt(0)}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:600 }}>{p.nombre}</div>
                    <div style={{ fontSize:11, color:'#6B6B6B' }}>{(p.pagos||[]).length} pagos · turno día {p.turno}</div>
                    <div className="progress-wrap" style={{ marginTop:4, width:120 }}><div className="progress-fill" style={{ width:`${pct}%` }} /></div>
                  </div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#27500A' }}>Bs {total}</div>
                </div>
              )
            })}
            {aprobados.length === 0 && <p style={{ fontSize:13, color:'#AAA', textAlign:'center', padding:20 }}>Sin participantes aprobados aún</p>}
          </div>
        </div>
      )}

      <div className="bottom-nav">
        {[['📊','panel','Panel'],['👥','participantes','Participantes'],['🖼','comprobantes','Balance']].map(([icon,id,label]) => (
          <button key={id} className={`nav-btn ${tab===id?'active':''}`} onClick={() => setTab(id)}>
            <span className="nav-icon">{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}
