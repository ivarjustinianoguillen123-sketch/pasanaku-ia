import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'

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
      montoTotal: montoNum,
      aporte: aporteNum,
      totalDias,
      fechaInicio,
      pagos: [],
      completado: false
    }
    await updateDoc(doc(db, 'participantes', seleccionado.id), {
      aprobado: true,
      rechazado: false,
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
    const nuevoAporte = prompt('Aporte diario para el nuevo crédito (Bs):')
    const nuevoMonto = prompt('Monto total a devolver (Bs):')
    const nuevaFecha = prompt('Fecha de inicio del nuevo crédito (YYYY-MM-DD):')
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
    const creditosNuevos = [...creditosActuales, nuevoCredito]
    await updateDoc(doc(db, 'participantes', participante.id), { creditos: creditosNuevos })
    await cargar()
    const snap = await getDocs(collection(db, 'participantes'))
    const refrescado = snap.docs.map(d => ({ id: d.id, ...d.data() })).find(p => p.id === participante.id)
    if (refrescado) setSeleccionado(refrescado)
  }

  const marcarPago = async (participante, creditoId, dia) => {
    setMarcandoDia(`${creditoId}-${dia}`)
    const creditos = (participante.creditos || []).map(c => {
      if (c.id !== creditoId) return c
      const yaPagado = (c.pagos || []).find(p => p.dia === dia)
      if (yaPagado) return c
      const nuevosPagos = [...(c.pagos || []), {
        dia,
        monto: c.aporte,
        fecha: new Date().toISOString().split('T')[0]
      }]
      const completado = nuevosPagos.length >= c.totalDias
      return { ...c, pagos: nuevosPagos, completado }
    })
    await updateDoc(doc(db, 'participantes', participante.id), { creditos })
    const snap = await getDocs(collection(db, 'participantes'))
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setParticipantes(todos)
    const refrescado = todos.find(p => p.id === participante.id)
    if (refrescado) setSeleccionado(refrescado)
    setMarcandoDia(null)
  }

  const desmarcarPago = async (participante, creditoId, dia) => {
    if (!window.confirm(`¿Desmarcar el pago del Día ${dia}?`)) return
    const creditos = (participante.creditos || []).map(c => {
      if (c.id !== creditoId) return c
      const nuevosPagos = (c.pagos || []).filter(p => p.dia !== dia)
      return { ...c, pagos: nuevosPagos, completado: false }
    })
    await updateDoc(doc(db, 'participantes', participante.id), { creditos })
    const snap = await getDocs(collection(db, 'participantes'))
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setParticipantes(todos)
    const refrescado = todos.find(p => p.id === participante.id)
    if (refrescado) setSeleccionado(refrescado)
  }

  const rechazar = async () => {
    if (!window.confirm('¿Rechazar esta solicitud?')) return
    await updateDoc(doc(db, 'participantes', seleccionado.id), { rechazado: true })
    await cargar()
    setSeleccionado(null)
  }

  // Solo aprobados y pendientes en listas normales — rechazados NO aparecen
  const pendientes = participantes.filter(p => !p.aprobado && !p.rechazado)
  const aprobados  = participantes.filter(p => p.aprobado && !p.rechazado)

  const lista =
    filtro === 'aprobado'  ? aprobados :
    filtro === 'pendiente' ? pendientes :
    participantes.filter(p => !p.rechazado) // 'todos' excluye rechazados

  const totalRecaudado = aprobados.reduce((s, p) =>
    s + (p.creditos || []).reduce((sc, c) =>
      sc + (c.pagos || []).reduce((sp, pg) => sp + pg.monto, 0), 0), 0)

  const pagosHoy = aprobados.filter(p =>
    (p.creditos || []).some(c =>
      (c.pagos || []).some(pg => pg.fecha === new Date().toISOString().split('T')[0])
    )
  ).length

  // ──────────────────────────────────────────────
  // VISTA PERFIL PARTICIPANTE
  // ──────────────────────────────────────────────
  if (seleccionado) return (
    <div className="page">
      <div className="top-bar">
        <button onClick={() => setSeleccionado(null)}
          style={{ background: 'none', color: '#F4C0D1', border: 'none', fontSize: 22 }}>←</button>
        <h1>Perfil participante</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="content">

        {/* CABECERA */}
        <div style={{ background: '#4B1528', borderRadius: 14, padding: 16,
          display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 20, color: '#F4C0D1', fontWeight: 700 }}>
            {seleccionado.nombre?.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#F4C0D1' }}>{seleccionado.nombre}</div>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.75)', marginTop: 2 }}>
              {seleccionado.negocio} · {seleccionado.email}
            </div>
          </div>
        </div>

        {/* DATOS PERSONALES */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 10 }}>Datos personales</div>
          {[
            ['CI',          seleccionado.ci],
            ['Celular',     seleccionado.celular],
            ['Domicilio',   seleccionado.domicilio],
            ['Cuenta',      seleccionado.cuenta],
            ['Fecha nac.',  seleccionado.fechaNac],
          ].map(([k, v]) => (
            <div key={k} className="info-row">
              <span className="info-key">{k}</span>
              <span className="info-val" style={{ fontSize: 12 }}>{v}</span>
            </div>
          ))}
          {seleccionado.ubicacion?.link && (
            <div className="info-row">
              <span className="info-key">Ubicación</span>
              <a href={seleccionado.ubicacion.link} target="_blank" rel="noreferrer"
                style={{ fontSize: 12, color: '#4B1528' }}>📍 Ver en mapa</a>
            </div>
          )}
        </div>

        {/* FORMULARIO APROBACIÓN */}
        {!seleccionado.aprobado && !seleccionado.rechazado && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">Aprobar crédito</div>

            <div className="form-group">
              <label>Monto total a devolver (Bs)</label>
              <input type="number" placeholder="600" value={monto}
                onChange={e => setMonto(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Aporte diario (Bs)</label>
              <input type="number" placeholder="25" value={aporte}
                onChange={e => setAporte(e.target.value)} />
            </div>

            {aporte && monto && parseFloat(aporte) > 0 && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC',
                borderRadius: 8, padding: 10, fontSize: 13, color: '#166534' }}>
                💡 Bs {aporte}/día × <strong>{Math.round(parseFloat(monto) / parseFloat(aporte))} días</strong>
                &nbsp;= Total Bs {monto}
              </div>
            )}

            <div className="form-group">
              <label>Fecha de inicio de pagos</label>
              <input type="date" value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)} />
            </div>

            <button className="btn-primary" style={{ background: '#27500A' }}
              disabled={guardando} onClick={aprobar}>
              {guardando ? 'Aprobando...' : '✅ Aprobar participante'}
            </button>
            <button style={{ background: 'none', color: '#791F1F',
              border: '1.5px solid #F09595', borderRadius: 12,
              padding: 12, fontSize: 14, fontWeight: 700 }}
              onClick={rechazar}>
              Rechazar solicitud
            </button>
          </div>
        )}

        {/* CRÉDITOS ACTIVOS */}
        {seleccionado.aprobado && (
          <>
            {(seleccionado.creditos || []).map((credito) => {
              const totalPagado  = (credito.pagos || []).reduce((s, p) => s + p.monto, 0)
              const diasPagados  = (credito.pagos || []).length
              const pct = Math.min(100, Math.round(diasPagados / credito.totalDias * 100))

              return (
                <div key={credito.id} className="card"
                  style={{ border: `2px solid ${credito.completado ? '#C0DD97' : '#F4C0D1'}` }}>

                  {/* CABECERA CRÉDITO */}
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 10 }}>
                    <div className="section-title" style={{ margin: 0 }}>
                      Crédito #{credito.numero}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px',
                      borderRadius: 20,
                      background: credito.completado ? '#EAF3DE' : '#FDF5F7',
                      color: credito.completado ? '#27500A' : '#4B1528' }}>
                      {credito.completado ? '✅ Completado' : '🔄 En curso'}
                    </span>
                  </div>

                  {/* RESUMEN */}
                  {[
                    ['Monto total',    `Bs ${credito.montoTotal}`],
                    ['Aporte diario',  `Bs ${credito.aporte}/día`],
                    ['Fecha inicio',   credito.fechaInicio],
                    ['Progreso',       `${diasPagados}/${credito.totalDias} días · Bs ${totalPagado} cobrados`],
                  ].map(([k, v]) => (
                    <div key={k} className="info-row">
                      <span className="info-key">{k}</span>
                      <span className="info-val" style={{ color: k === 'Monto total' ? '#4B1528' : undefined, fontWeight: k === 'Monto total' ? 700 : undefined }}>{v}</span>
                    </div>
                  ))}

                  {/* BARRA PROGRESO */}
                  <div style={{ background: '#EEE', borderRadius: 20, height: 6, margin: '10px 0' }}>
                    <div style={{
                      background: credito.completado ? '#97C459' : '#4B1528',
                      width: `${pct}%`, height: '100%', borderRadius: 20, transition: 'width 0.3s'
                    }} />
                  </div>

                  {/* GRILLA DE DÍAS */}
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                    {credito.completado
                      ? '🎉 Todos los pagos completados'
                      : 'Toca un día ✅ para marcarlo como pagado · Mantén presionado para desmarcar:'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
                    {Array.from({ length: credito.totalDias }, (_, i) => i + 1).map(d => {
                      const pagado   = (credito.pagos || []).find(p => p.dia === d)
                      const cargandoEste = marcandoDia === `${credito.id}-${d}`
                      return (
                        <div key={d}
                          onClick={() => !cargandoEste && !pagado && marcarPago(seleccionado, credito.id, d)}
                          onContextMenu={(e) => { e.preventDefault(); if (pagado) desmarcarPago(seleccionado, credito.id, d) }}
                          title={pagado
                            ? `Pagado el ${pagado.fecha} · Bs ${pagado.monto} (clic derecho para desmarcar)`
                            : 'Pendiente — toca para marcar como pagado'}
                          style={{
                            borderRadius: 6, padding: '5px 2px',
                            textAlign: 'center', fontSize: 10, fontWeight: 700,
                            background: cargandoEste ? '#FFF3CD' : pagado ? '#EAF3DE' : '#F0EFED',
                            color: cargandoEste ? '#854F0B' : pagado ? '#27500A' : '#BBB',
                            cursor: pagado ? 'default' : 'pointer',
                            border: pagado ? '1px solid #C0DD97' : '1px solid #EEE',
                            userSelect: 'none'
                          }}>
                          D{d}<br />
                          <span style={{ fontSize: 9 }}>
                            {cargandoEste ? '...' : pagado ? `✓${pagado.monto}` : '---'}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {credito.completado && (
                    <div style={{ textAlign: 'center', padding: '10px 0',
                      fontSize: 13, color: '#27500A', fontWeight: 600 }}>
                      🎉 Crédito completado · Total recibido: Bs {totalPagado}
                    </div>
                  )}
                </div>
              )
            })}

            {/* NUEVO CRÉDITO */}
            <button className="btn-secondary"
              onClick={() => agregarCredito(seleccionado)}
              style={{ width: '100%' }}>
              ➕ Agregar nuevo crédito
            </button>
          </>
        )}

        {/* WHATSAPP */}
        <button style={{ background: '#25D366', color: 'white', border: 'none',
          borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, width: '100%' }}
          onClick={() => window.open(
            WHATSAPP(seleccionado.celular, `Hola ${seleccionado.nombre}, te contactamos del Pasanaku-IA.`),
            '_blank'
          )}>
          📲 Contactar por WhatsApp
        </button>

      </div>
    </div>
  )

  // ──────────────────────────────────────────────
  // VISTA PRINCIPAL (tabs)
  // ──────────────────────────────────────────────
  return (
    <div className="page">
      <div className="top-bar">
        <span style={{ fontSize: 22 }}>💰</span>
        <h1>{tab === 'panel' ? 'Panel Admin' : tab === 'participantes' ? 'Participantes' : 'Balance'}</h1>
        <button onClick={() => auth.signOut()}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#F4C0D1',
            border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
          Salir
        </button>
      </div>

      {/* ── PANEL ── */}
      {tab === 'panel' && (
        <div className="content">
          <div style={{ background: '#4B1528', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.7)', marginBottom: 4 }}>
              Total recaudado
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#F4C0D1' }}>
              Bs {totalRecaudado.toLocaleString()}
            </div>
          </div>

          <div className="metric-grid">
            {[
              ['Aprobados',      aprobados.length,    '#27500A'],
              ['Pagaron hoy',    `${pagosHoy}/${aprobados.length}`, undefined],
              ['Pendientes',     pendientes.length,   '#854F0B'],
              ['Recaudado',      `Bs ${totalRecaudado}`, '#27500A'],
            ].map(([label, val, color]) => (
              <div key={label} className="metric-card">
                <div className="metric-label">{label}</div>
                <div className="metric-value" style={{ color, fontSize: label === 'Recaudado' ? 13 : undefined }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          {pendientes.length > 0 && (
            <div className="card" style={{ border: '2px solid #FAEEDA' }}>
              <div className="section-title" style={{ color: '#854F0B', marginBottom: 10 }}>
                ⚠️ Solicitudes pendientes ({pendientes.length})
              </div>
              {pendientes.slice(0, 3).map(p => (
                <div key={p.id} className="row" onClick={() => setSeleccionado(p)}
                  style={{ cursor: 'pointer' }}>
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
              <div style={{ background: '#E24B4A', flex: Math.max(0.1, pendientes.length) }} />
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[['#97C459','Al día', aprobados.length], ['#EF9F27','1 día sin pagar', 0], ['#E24B4A','2+ días sin pagar', 0]].map(([c, l, n]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6B6B6B' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />{l} ({n})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PARTICIPANTES ── */}
      {tab === 'participantes' && (
        <div className="content">
          {/* Filtros: sin "Rechazados" ya que se eliminan directamente */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {[
              ['aprobado',  'Aprobados'],
              ['pendiente', 'Pendientes'],
              ['todos',     'Todos'],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setFiltro(id)} style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                whiteSpace: 'nowrap', border: '1px solid #EEE',
                background: filtro === id ? '#4B1528' : 'white',
                color: filtro === id ? '#F4C0D1' : '#6B6B6B'
              }}>{label}</button>
            ))}
          </div>

          {cargando ? <div className="spinner" /> : (
            <div className="card">
              {lista.length === 0
                ? <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 20 }}>
                    Sin resultados
                  </p>
                : lista.map(p => (
                  <div key={p.id} className="row" onClick={() => setSeleccionado(p)}
                    style={{ cursor: 'pointer' }}>
                    <div className={`avatar ${p.aprobado ? 'av-green' : 'av-amber'}`}>
                      {p.nombre?.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B' }}>{p.negocio} · {p.ci}</div>
                      {p.aprobado && (
                        <div style={{ fontSize: 11, color: '#27500A', marginTop: 2 }}>
                          {(p.creditos || []).length} crédito(s) · Bs {p.aporte}/día
                        </div>
                      )}
                    </div>
                    <span className={`badge ${p.aprobado ? 'badge-ok' : 'badge-warn'}`}>
                      {p.aprobado ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </div>
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* ── BALANCE ── */}
      {tab === 'comprobantes' && (
        <div className="content">
          <div className="card" style={{ background: '#4B1528' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.7)' }}>Total recaudado</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F4C0D1', marginTop: 4 }}>
                  Bs {totalRecaudado.toLocaleString()}
                </div>
              </div>
              <div style={{ fontSize: 36 }}>📊</div>
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: 10 }}>Resumen por participante</div>
            {aprobados.length === 0
              ? <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 20 }}>
                  Sin participantes aprobados aún
                </p>
              : aprobados.map(p => {
                  const totalP     = (p.creditos || []).reduce((s, c) => s + (c.pagos || []).reduce((sc, pg) => sc + pg.monto, 0), 0)
                  const totalDias  = (p.creditos || []).reduce((s, c) => s + c.totalDias, 0)
                  const diasPagados = (p.creditos || []).reduce((s, c) => s + (c.pagos || []).length, 0)
                  const pct = totalDias > 0 ? Math.min(100, Math.round(diasPagados / totalDias * 100)) : 0
                  return (
                    <div key={p.id} className="row" onClick={() => setSeleccionado(p)}
                      style={{ cursor: 'pointer' }}>
                      <div className="avatar av-green">{p.nombre?.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: '#6B6B6B' }}>
                          {diasPagados} pagos · {(p.creditos || []).length} crédito(s)
                        </div>
                        <div style={{ background: '#EEE', borderRadius: 20, height: 5, marginTop: 4, width: 120 }}>
                          <div style={{ background: '#4B1528', width: `${pct}%`, height: '100%', borderRadius: 20 }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#27500A' }}>Bs {totalP}</div>
                    </div>
                  )
                })
            }
          </div>
        </div>
      )}

      {/* ── NAVEGACIÓN ── */}
      <div className="bottom-nav">
        {[['📊','panel','Panel'], ['👥','participantes','Participantes'], ['💰','comprobantes','Balance']].map(([icon, id, label]) => (
          <button key={id} className={`nav-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <span className="nav-icon">{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}
