import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore'

const WHATSAPP = (cel, msg) => `https://wa.me/591${cel.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`

export default function DashboardAdmin() {
  const [tab, setTab] = useState('panel')
  const [participantes, setParticipantes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionado, setSeleccionado] = useState(null)
  const [aporte, setAporte] = useState('')
  const [monto, setMonto] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('aprobado')
  const [marcandoDia, setMarcandoDia] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    const snap = await getDocs(collection(db, 'participantes'))
    setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setCargando(false)
  }

  const aprobar = async () => {
    if (!aporte || !monto || !fechaInicio) return
    setGuardando(true)
    const aporteNum = parseFloat(aporte)
    const montoNum = parseFloat(monto)
    const totalDias = Math.round(montoNum / aporteNum)
    const credito = {
      id: Date.now(),
      numero: 1,
      montoEntregado: montoNum - (montoNum - parseFloat(monto)),
      montoTotal: montoNum,
      aporte: aporteNum,
      totalDias,
      fechaInicio,
      pagos: [],
      completado: false
    }
    await updateDoc(doc(db, 'participantes', seleccionado.id), {
      aprobado: true,
      bienvenidaVista: false,
      aporte: aporteNum,
      monto: montoNum,
      totalDias,
      fechaInicio,
      creditos: [credito]
    })
    await cargar()
    setSeleccionado(null)
    setAporte('')
    setMonto('')
    setFechaInicio('')
    setGuardando(false)
  }

  const agregarCredito = async (participante) => {
    const nuevoAporte = prompt(`Aporte diario para el nuevo crédito (Bs):`)
    const nuevoMonto = prompt(`Monto total a devolver (Bs):`)
    const nuevaFecha = prompt(`Fecha de inicio (YYYY-MM-DD):`)
    if (!nuevoAporte || !nuevoMonto || !nuevaFecha) return
    const aporteNum = parseFloat(nuevoAporte)
    const montoNum = parseFloat(nuevoMonto)
    const totalDias = Math.round(montoNum / aporteNum)
    const creditosActuales = participante.creditos || []
    const nuevoCredito = {
      id: Date.now(),
      numero: creditosActuales.length + 1,
      montoTotal: montoNum,
      aporte: aporteNum,
      totalDias,
      fechaInicio: nuevaFecha,
      pagos: [],
      completado: false
    }
    await updateDoc(doc(db, 'participantes', participante.id), {
      creditos: [...creditosActuales, nuevoCredito]
    })
    await cargar()
    const actualizado = participantes.find(p => p.id === participante.id)
    if (actualizado) setSeleccionado({ ...actualizado, creditos: [...creditosActuales, nuevoCredito] })
  }

  const marcarPago = async (participante, creditoId, dia) => {
    setMarcandoDia(`${creditoId}-${dia}`)
    const creditos = (participante.creditos || []).map(c => {
      if (c.id !== creditoId) return c
      const yaPagado = (c.pagos || []).find(p => p.dia === dia)
      if (yaPagado) return c
      const nuevosPagos = [...(c.pagos || []), { dia, monto: c.aporte, fecha: new Date().toISOString().split('T')[0] }]
      const completado = nuevosPagos.length >= c.totalDias
      return { ...c, pagos: nuevosPagos, completado }
    })
    await updateDoc(doc(db, 'participantes', participante.id), { creditos })
    await cargar()
    const refrescado = (await getDocs(collection(db, 'participantes'))).docs.map(d => ({ id: d.id, ...d.data() })).find(p => p.id === participante.id)
    if (refrescado) setSeleccionado(refrescado)
    setMarcandoDia(null)
  }

  const rechazar = async () => {
    await updateDoc(doc(db, 'participantes', seleccionado.id), { rechazado: true })
    await cargar()
    setSeleccionado(null)
  }

  const pendientes = participantes.filter(p => !p.aprobado && !p.rechazado)
  const aprobados = participantes.filter(p => p.aprobado)

  const lista = filtro === 'todos' ? participantes.filter(p => !p.rechazado)
    : filtro === 'pendiente' ? pendientes
    : filtro === 'aprobado' ? aprobados
    : participantes.filter(p => p.rechazado)

  const totalRecaudado = aprobados.reduce((s, p) =>
    s + (p.creditos || []).reduce((sc, c) =>
      sc + (c.pagos || []).reduce((sp, pg) => sp + pg.monto, 0), 0), 0)

  const pagosHoy = aprobados.filter(p =>
    (p.creditos || []).some(c =>
      (c.pagos || []).some(pg => pg.fecha === new Date().toISOString().split('T')[0])
    )
  ).length

  if (seleccionado) return (
    <div className="page">
      <div className="top-bar">
        <button onClick={() => setSeleccionado(null)} style={{ background: 'none', color: '#F4C0D1', border: 'none', fontSize: 22 }}>←</button>
        <h1>Perfil participante</h1>
      </div>
      <div className="content">

        {/* CABECERA */}
        <div style={{ background: '#4B1528', borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#F4C0D1', fontWeight: 700 }}>
            {seleccionado.nombre?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#F4C0D1' }}>{seleccionado.nombre}</div>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.75)', marginTop: 2 }}>{seleccionado.negocio} · {seleccionado.email}</div>
          </div>
        </div>

        {/* DATOS PERSONALES */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 10 }}>Datos personales</div>
          <div className="info-row"><span className="info-key">CI</span><span className="info-val">{seleccionado.ci}</span></div>
          <div className="info-row"><span className="info-key">Celular</span><span className="info-val">{seleccionado.celular}</span></div>
          <div className="info-row"><span className="info-key">Domicilio</span><span className="info-val" style={{ fontSize: 12 }}>{seleccionado.domicilio}</span></div>
          <div className="info-row"><span className="info-key">Cuenta</span><span className="info-val" style={{ fontSize: 12 }}>{seleccionado.cuenta}</span></div>
          <div className="info-row"><span className="info-key">Fecha nac.</span><span className="info-val">{seleccionado.fechaNac}</span></div>
          {seleccionado.ubicacion?.link && (
            <div className="info-row">
              <span className="info-key">Ubicación</span>
              <a href={seleccionado.ubicacion.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#4B1528' }}>📍 Ver en mapa</a>
            </div>
          )}
        </div>

        {/* FORMULARIO DE APROBACION */}
        {!seleccionado.aprobado && !seleccionado.rechazado && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">Aprobar crédito</div>
            <div className="form-group">
              <label>Monto a entregar (Bs)</label>
              <input type="number" placeholder="500" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Aporte diario (Bs)</label>
              <input type="number" placeholder="25" value={aporte} onChange={e => setAporte(e.target.value)} />
            </div>
            {aporte && monto && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: 10, fontSize: 13, color: '#166534' }}>
                💡 Pagará Bs {aporte}/día por <strong>{Math.round(parseFloat(monto) / parseFloat(aporte))} días</strong> · Total a devolver: <strong>Bs {monto}</strong>
              </div>
            )}
            <div className="form-group">
              <label>Fecha de inicio de pagos</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <button className="btn-primary" style={{ background: '#27500A' }} disabled={guardando} onClick={aprobar}>
              {guardando ? 'Aprobando...' : '✅ Aprobar participante'}
            </button>
            <button style={{ background: 'none', color: '#791F1F', border: '1.5px solid #F09595', borderRadius: 12, padding: 12, fontSize: 14, fontWeight: 700 }} onClick={rechazar}>
              Rechazar solicitud
            </button>
          </div>
        )}

        {/* CREDITOS ACTIVOS */}
        {seleccionado.aprobado && (
          <>
            {(seleccionado.creditos || []).map((credito, idx) => {
              const totalPagado = (credito.pagos || []).reduce((s, p) => s + p.monto, 0)
              const diasPagados = (credito.pagos || []).length
              const pct = Math.round(diasPagados / credito.totalDias * 100)
              return (
                <div key={credito.id} className="card" style={{ border: credito.completado ? '2px solid #C0DD97' : '2px solid #F4C0D1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div className="section-title" style={{ margin: 0 }}>
                      Crédito #{credito.numero}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: credito.completado ? '#EAF3DE' : '#FDF5F7', color: credito.completado ? '#27500A' : '#4B1528' }}>
                      {credito.completado ? '✅ Completado' : '🔄 En curso'}
                    </span>
                  </div>

                  <div className="info-row"><span className="info-key">Monto total</span><span className="info-val" style={{ color: '#4B1528', fontWeight: 700 }}>Bs {credito.montoTotal}</span></div>
                  <div className="info-row"><span className="info-key">Aporte diario</span><span className="info-val">Bs {credito.aporte}/día</span></div>
                  <div className="info-row"><span className="info-key">Fecha inicio</span><span className="info-val">{credito.fechaInicio}</span></div>
                  <div className="info-row"><span className="info-key">Progreso</span><span className="info-val">{diasPagados}/{credito.totalDias} días · Bs {totalPagado}</span></div>

                  <div style={{ background: '#EEE', borderRadius: 20, height: 6, margin: '10px 0' }}>
                    <div style={{ background: credito.completado ? '#97C459' : '#4B1528', width: `${pct}%`, height: '100%', borderRadius: 20, transition: 'width 0.3s' }} />
                  </div>

                  {/* GRILLA DE PAGOS */}
                  {!credito.completado && (
                    <>
                      <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Toca un día para marcarlo como pagado:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
                        {Array.from({ length: credito.totalDias }, (_, i) => i + 1).map(d => {
                          const pagado = (credito.pagos || []).find(p => p.dia === d)
                          const cargando = marcandoDia === `${credito.id}-${d}`
                          return (
                            <div key={d}
                              onClick={() => !pagado && !cargando && marcarPago(seleccionado, credito.id, d)}
                              title={pagado ? `Pagado el ${pagado.fecha} · Bs ${pagado.monto}` : 'Pendiente — toca para marcar'}
                              style={{
                                borderRadius: 6, padding: '5px 2px', textAlign: 'center', fontSize: 10, fontWeight: 700,
                                background: cargando ? '#FFF3CD' : pagado ? '#EAF3DE' : '#F0EFED',
                                color: cargando ? '#854F0B' : pagado ? '#27500A' : '#BBB',
                                cursor: pagado ? 'default' : 'pointer',
                                border: pagado ? '1px solid #C0DD97' : '1px solid #EEE'
                              }}>
                              D{d}<br />
                              <span style={{ fontSize: 9 }}>{cargando ? '...' : pagado ? `✓${pagado.monto}` : '---'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {credito.completado && (
                    <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 13, color: '#27500A', fontWeight: 600 }}>
                      🎉 Crédito completado · Total recibido: Bs {totalPagado}
                    </div>
                  )}
                </div>
              )
            })}

            {/* BOTON AGREGAR NUEVO CREDITO */}
            <button
              className="btn-secondary"
              onClick={() => agregarCredito(seleccionado)}
              style={{ width: '100%' }}>
              ➕ Agregar nuevo crédito
            </button>
          </>
        )}

        {/* WHATSAPP */}
        <button style={{ background: '#25D366', color: 'white', border: 'none', borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, width: '100%' }}
          onClick={() => window.open(WHATSAPP(seleccionado.celular, `Hola ${seleccionado.nombre}, te contactamos del Pasanaku-IA.`))}>
          📲 Contactar por WhatsApp
        </button>

      </div>
    </div>
  )

  return (
    <div className="page">
      <div className="top-bar">
        <span style={{ fontSize: 22 }}>💰</span>
        <h1>{tab === 'panel' ? 'Panel Admin' : tab === 'participantes' ? 'Participantes' : 'Balance'}</h1>
        <button onClick={() => auth.signOut()} style={{ background: 'rgba(255,255,255,0.15)', color: '#F4C0D1', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>Salir</button>
      </div>

      {/* PANEL PRINCIPAL */}
      {tab === 'panel' && (
        <div className="content">
          <div style={{ background: '#4B1528', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.7)', marginBottom: 4 }}>Total recaudado</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#F4C0D1' }}>Bs {totalRecaudado.toLocaleString()}</div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, height: 6, marginTop: 10 }}>
              <div style={{ background: '#C0DD97', width: '75%', height: '100%', borderRadius: 20 }} />
            </div>
          </div>

          <div className="metric-grid">
            <div className="metric-card"><div className="metric-label">Aprobados</div><div className="metric-value" style={{ color: '#27500A' }}>{aprobados.length}</div></div>
            <div className="metric-card"><div className="metric-label">Pagaron hoy</div><div className="metric-value">{pagosHoy}/{aprobados.length}</div></div>
            <div className="metric-card"><div className="metric-label">Pendientes</div><div className="metric-value" style={{ color: '#854F0B' }}>{pendientes.length}</div></div>
            <div className="metric-card"><div className="metric-label">Total recaudado</div><div className="metric-value" style={{ fontSize: 14, color: '#27500A' }}>Bs {totalRecaudado}</div></div>
          </div>

          {pendientes.length > 0 && (
            <div className="card" style={{ border: '2px solid #FAEEDA' }}>
              <div className="section-title" style={{ color: '#854F0B', marginBottom: 10 }}>⚠️ Solicitudes pendientes ({pendientes.length})</div>
              {pendientes.slice(0, 3).map(p => (
                <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor: 'pointer' }}>
                  <div className="avatar av-amber">{p.nombre?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: '#6B6B6B' }}>{p.negocio} · {p.celular}</div>
                  </div>
                  <span className="badge badge-warn">Revisar →</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="section-title" style={{ marginBottom: 10 }}>Semáforo de riesgo</div>
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 10, marginBottom: 8 }}>
              <div style={{ background: '#97C459', flex: Math.max(1, aprobados.length) }} />
              <div style={{ background: '#EF9F27', flex: 1 }} />
              <div style={{ background: '#E24B4A', flex: Math.max(0, pendientes.length) }} />
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[['#97C459', 'Al día', aprobados.length], ['#EF9F27', '1 día sin pagar', 0], ['#E24B4A', '2+ días sin pagar', 0]].map(([c, l, n]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B6B6B' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l} ({n})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* LISTA PARTICIPANTES */}
      {tab === 'participantes' && (
        <div className="content">
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {[['aprobado', 'Aprobados'], ['pendiente', 'Pendientes'], ['todos', 'Todos'], ['rechazado', 'Rechazados']].map(([id, label]) => (
              <button key={id} onClick={() => setFiltro(id)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', border: '1px solid #EEE',
                background: filtro === id ? '#4B1528' : 'white', color: filtro === id ? '#F4C0D1' : '#6B6B6B'
              }}>{label}</button>
            ))}
          </div>

          {cargando ? <div className="spinner" /> : (
            <div className="card">
              {lista.length === 0
                ? <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 20 }}>Sin resultados</p>
                : lista.map(p => (
                  <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor: 'pointer' }}>
                    <div className={`avatar ${p.aprobado ? 'av-green' : p.rechazado ? 'av-red' : 'av-amber'}`}>{p.nombre?.charAt(0)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B' }}>{p.negocio} · {p.ci}</div>
                      {p.aprobado && (
                        <div style={{ fontSize: 11, color: '#27500A', marginTop: 2 }}>
                          {(p.creditos || []).length} crédito(s) · Bs {p.aporte}/día
                        </div>
                      )}
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

      {/* BALANCE */}
      {tab === 'comprobantes' && (
        <div className="content">
          <div className="card" style={{ background: '#4B1528' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.7)' }}>Total recaudado</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F4C0D1', marginTop: 4 }}>Bs {totalRecaudado.toLocaleString()}</div>
              </div>
              <div style={{ fontSize: 36 }}>📊</div>
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 10 }}>Resumen por participante</div>
            {aprobados.map(p => {
              const totalP = (p.creditos || []).reduce((s, c) => s + (c.pagos || []).reduce((sc, pg) => sc + pg.monto, 0), 0)
              const totalDias = (p.creditos || []).reduce((s, c) => s + c.totalDias, 0)
              const diasPagados = (p.creditos || []).reduce((s, c) => s + (c.pagos || []).length, 0)
              const pct = totalDias > 0 ? Math.round(diasPagados / totalDias * 100) : 0
              return (
                <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor: 'pointer' }}>
                  <div className="avatar av-green">{p.nombre?.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: '#6B6B6B' }}>{diasPagados} pagos · {(p.creditos || []).length} crédito(s)</div>
                    <div className="progress-wrap" style={{ marginTop: 4, width: 120 }}>
                      <div className="progress-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#27500A' }}>Bs {totalP}</div>
                </div>
              )
            })}
            {aprobados.length === 0 && <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 20 }}>Sin participantes aprobados aún</p>}
          </div>
        </div>
      )}

      <div className="bottom-nav">
        {[['📊', 'panel', 'Panel'], ['👥', 'participantes', 'Participantes'], ['💰', 'comprobantes', 'Balance']].map(([icon, id, label]) => (
          <button key={id} className={`nav-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <span className="nav-icon">{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}
