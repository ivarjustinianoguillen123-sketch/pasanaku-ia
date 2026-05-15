import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { doc, getDoc } from 'firebase/firestore'

const fechaDia = (fechaInicio, dia) => {
  if (!fechaInicio) return ''
  const d = new Date(fechaInicio + 'T12:00:00')
  d.setDate(d.getDate() + dia - 1)
  return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })
}

export default function DashboardParticipante({ user, perfil: perfilInicial }) {
  const [tab, setTab] = useState('inicio')
  const [perfil, setPerfil] = useState(perfilInicial)

  // Recargar perfil desde Firestore al entrar
  useEffect(() => {
    const cargar = async () => {
      const snap = await getDoc(doc(db, 'participantes', user.uid))
      if (snap.exists()) setPerfil({ id: snap.id, ...snap.data() })
    }
    cargar()
  }, [user.uid])

  const creditos = perfil?.creditos || []
  const creditosActivos = creditos.filter(c => !c.historial)
  const creditosArchivados = creditos.filter(c => c.historial)

  const totalPagadoGlobal = creditos.reduce((s, c) =>
    s + (c.pagos || []).reduce((sc, p) => sc + p.monto, 0), 0)

  return (
    <div className="page">
      <div className="top-bar">
        <span style={{ fontSize: 22 }}>💰</span>
        <h1>Mi Pasanaku</h1>
        <button onClick={() => auth.signOut()}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#F4C0D1', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 12 }}>
          Salir
        </button>
      </div>

      {tab === 'inicio' && (
        <div className="content">

          {/* RESUMEN GENERAL */}
          <div style={{ background: '#4B1528', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.7)', marginBottom: 4 }}>Total pagado hasta hoy</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#F4C0D1' }}>Bs {totalPagadoGlobal.toLocaleString()}</div>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.6)', marginTop: 4 }}>
              {creditosActivos.length} crédito(s) activo(s) · {creditosArchivados.length} completado(s)
            </div>
          </div>

          {/* CRÉDITOS ACTIVOS */}
          {creditosActivos.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⏳</div>
              <p style={{ fontSize: 14, color: '#666' }}>No tienes créditos activos en este momento.</p>
            </div>
          )}

          {creditosActivos.map(credito => {
            const diasPagados = (credito.pagos || []).length
            const pct = Math.min(100, Math.round(diasPagados / credito.totalDias * 100))
            const totalPagado = (credito.pagos || []).reduce((s, p) => s + p.monto, 0)
            const faltaPagar = credito.montoTotal - totalPagado

            return (
              <div key={credito.id} className="card" style={{ border: '2px solid #F4C0D1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div className="section-title" style={{ margin: 0 }}>Crédito #{credito.numero}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#FDF5F7', color: '#4B1528' }}>
                    🔄 En curso
                  </span>
                </div>

                <div className="metric-grid" style={{ marginBottom: 10 }}>
                  {[
                    ['A pagar en total', `Bs ${credito.montoTotal}`],
                    ['Aporte diario', `Bs ${credito.aporte}`],
                    ['Ya pagado', `Bs ${totalPagado}`],
                    ['Falta pagar', `Bs ${faltaPagar}`],
                  ].map(([label, val]) => (
                    <div key={label} className="metric-card">
                      <div className="metric-label">{label}</div>
                      <div className="metric-value" style={{ fontSize: 13 }}>{val}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B6B6B', marginBottom: 6 }}>
                  <span>{diasPagados}/{credito.totalDias} días pagados</span>
                  <span>{pct}%</span>
                </div>
                <div className="progress-wrap">
                  <div className="progress-fill" style={{ width: `${pct}%` }} />
                </div>

                {/* GRILLA DE DÍAS */}
                <div style={{ marginTop: 12, fontSize: 12, color: '#666', marginBottom: 6 }}>📅 Calendario de pagos:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
                  {Array.from({ length: credito.totalDias }, (_, i) => i + 1).map(d => {
                    const pagado = (credito.pagos || []).find(p => p.dia === d)
                    const etiquetaFecha = fechaDia(credito.fechaInicio, d)
                    return (
                      <div key={d} style={{
                        borderRadius: 6, padding: '4px 2px', textAlign: 'center',
                        lineHeight: 1.4, userSelect: 'none',
                        background: pagado ? '#EAF3DE' : '#F0EFED',
                        border: pagado ? '1px solid #C0DD97' : '1px solid #EEE',
                      }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: pagado ? '#27500A' : '#BBB' }}>D{d}</div>
                        <div style={{ fontSize: 8, color: pagado ? '#27500A' : '#AAA' }}>{etiquetaFecha}</div>
                        <div style={{ fontSize: 9, color: pagado ? '#27500A' : '#BBB' }}>
                          {pagado ? `✓${pagado.monto}` : '---'}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="card" style={{ background: '#FFF8E7', border: '1px solid #F5D77E', marginTop: 10 }}>
                  <p style={{ fontSize: 12, color: '#854F0B' }}>
                    📲 Envía tu comprobante de pago directamente por WhatsApp al administrador cada día que realices tu pago.
                  </p>
                </div>
              </div>
            )
          })}

          {/* CRÉDITOS COMPLETADOS */}
          {creditosArchivados.length > 0 && (
            <div className="card">
              <div className="section-title" style={{ marginBottom: 10 }}>🏆 Créditos completados</div>
              {creditosArchivados.map(credito => (
                <div key={credito.id} style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#27500A' }}>Crédito #{credito.numero}</div>
                    <span style={{ fontSize: 11, background: '#EAF3DE', color: '#27500A', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>✅ Completado</span>
                  </div>
                  {[
                    ['Inicio', credito.historial?.fechaInicio],
                    ['Finalización', credito.historial?.fechaFin],
                    ['Total pagado', `Bs ${credito.historial?.totalPagado}`],
                  ].map(([k, v]) => (
                    <div key={k} className="info-row" style={{ padding: '2px 0' }}>
                      <span className="info-key" style={{ fontSize: 11 }}>{k}</span>
                      <span className="info-val" style={{ fontSize: 12 }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="content">
          {creditos.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>
              <p style={{ fontSize: 13, color: '#AAA' }}>No hay historial de pagos aún</p>
            </div>
          ) : creditos.map(credito => (
            <div key={credito.id} className="card">
              <div className="section-title" style={{ marginBottom: 10 }}>
                Crédito #{credito.numero} {credito.historial ? '✅' : '🔄'}
              </div>
              {(credito.pagos || []).length === 0
                ? <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 10 }}>Sin pagos aún</p>
                : (credito.pagos || []).map((p, i) => (
                  <div key={i} className="row">
                    <div className="avatar av-green" style={{ fontSize: 10 }}>D{p.dia}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>Día {p.dia} · {fechaDia(credito.fechaInicio, p.dia)}</div>
                      <div style={{ fontSize: 11, color: '#6B6B6B' }}>{p.fecha}</div>
                    </div>
                    <span className="badge badge-ok">Bs {p.monto}</span>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      )}

      {tab === 'perfil' && (
        <div className="content">
          <div className="card">
            <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#4B1528', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#F4C0D1', margin: '0 auto 12px' }}>
                {perfil?.nombre?.charAt(0) || '?'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{perfil?.nombre}</div>
              <div style={{ fontSize: 13, color: '#6B6B6B', marginTop: 4 }}>{perfil?.negocio}</div>
            </div>
            {[['CI', perfil?.ci], ['Celular', perfil?.celular], ['Domicilio', perfil?.domicilio], ['Cuenta', perfil?.cuenta]].map(([k, v]) => (
              <div key={k} className="info-row">
                <span className="info-key">{k}</span>
                <span className="info-val" style={{ fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => auth.signOut()}>Cerrar sesión</button>
        </div>
      )}

      <div className="bottom-nav">
        {[['🏠','inicio','Inicio'], ['📅','historial','Historial'], ['👤','perfil','Perfil']].map(([icon, id, label]) => (
          <button key={id} className={`nav-btn ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <span className="nav-icon">{icon}</span>{label}
          </button>
        ))}
      </div>
    </div>
  )
}
