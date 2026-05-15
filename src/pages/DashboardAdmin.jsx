import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc as firestoreDoc, setDoc, serverTimestamp } from 'firebase/firestore'

const WHATSAPP = (cel, msg) => `https://wa.me/591${cel.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`
const WHATSAPP_ADMIN = '59176710209'

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

  // Estado para nuevo participante
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false)
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '', ci: '', fechaNac: '', celular: '', domicilio: '',
    cuenta: '', negocio: '', email: '', password: ''
  })
  const [nuevoFotos, setNuevoFotos] = useState({
    ciFront: null, ciBack: null, selfie: null, negExt: null, negInt: null
  })
  const [guardandoNuevo, setGuardandoNuevo] = useState(false)
  const [errorNuevo, setErrorNuevo] = useState('')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    const snap = await getDocs(collection(db, 'participantes'))
    setParticipantes(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    setCargando(false)
  }

  const setNuevo = (k, v) => setNuevoForm(f => ({ ...f, [k]: v }))

  const capturarFotoNuevo = (id) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setNuevoFotos(f => ({ ...f, [id]: { file, url } }))
      }
    }
    input.click()
  }

  const registrarNuevoParticipante = async () => {
    const { nombre, ci, fechaNac, celular, domicilio, cuenta, negocio, email, password } = nuevoForm
    if (!nombre || !ci || !fechaNac || !celular || !domicilio || !cuenta || !negocio || !email || !password) {
      setErrorNuevo('Completa todos los campos obligatorios')
      return
    }
    if (password.length < 6) {
      setErrorNuevo('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setGuardandoNuevo(true)
    setErrorNuevo('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(firestoreDoc(db, 'participantes', cred.user.uid), {
        uid: cred.user.uid,
        nombre, ci, fechaNac, celular, domicilio, cuenta, negocio, email,
        ubicacion: null,
        aprobado: false,
        rechazado: false,
        turno: null,
        monto: null,
        fechaTransferencia: null,
        pagos: [],
        creadoEn: serverTimestamp()
      })

      const fotosCapturadas = Object.entries(nuevoFotos)
        .filter(([, v]) => v !== null)
        .map(([k]) => ({
          ciFront: '📷 CI Anverso', ciBack: '📷 CI Reverso',
          selfie: '🤳 Selfie con CI', negExt: '🏪 Exterior negocio', negInt: '🏬 Interior negocio'
        }[k]))
        .join(', ')

      const msg =
`🆕 *NUEVO REGISTRO (Admin) - Pasanaku-IA*

👤 *Nombre:* ${nombre}
🪪 *CI:* ${ci}
📅 *Fecha nac.:* ${fechaNac}
📱 *Celular:* ${celular}
📍 *Domicilio:* ${domicilio}
🏪 *Negocio:* ${negocio}
🏦 *Cuenta:* ${cuenta}
📧 *Email:* ${email}

📸 *Fotos:* ${fotosCapturadas || 'No se tomaron fotos — solicitarlas al participante'}

⚠️ *Envía las fotos pendientes en este chat si las tienes:*
1️⃣ CI Anverso · 2️⃣ CI Reverso · 3️⃣ Selfie con CI
4️⃣ Foto exterior negocio · 5️⃣ Foto interior negocio

✅ Registrado desde panel administrador`

      window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(msg)}`, '_blank')

      // Resetear formulario
      setNuevoForm({ nombre: '', ci: '', fechaNac: '', celular: '', domicilio: '', cuenta: '', negocio: '', email: '', password: '' })
      setNuevoFotos({ ciFront: null, ciBack: null, selfie: null, negExt: null, negInt: null })
      setMostrarFormNuevo(false)
      await cargar()

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setErrorNuevo('Este correo ya está registrado.')
      else if (err.code === 'auth/invalid-email') setErrorNuevo('El correo no es válido.')
      else setErrorNuevo('Error al registrar. Intenta de nuevo.')
    }
    setGuardandoNuevo(false)
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
    const snap = await getDocs(collection(db, 'participantes'))
    const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setParticipantes(todos)
    const refrescado = todos.find(p => p.id === participante.id)
    if (refrescado) setSeleccionado(refrescado)
  }

  const marcarPago = async (participante, creditoId, dia) => {
    setMarcandoDia(`${creditoId}-${dia}`)
    const creditos = (participante.creditos || []).map(c => {
      if (c.id !== creditoId) return c
      const yaPagado = (c.pagos || []).find(p => p.dia === dia)
      if (yaPagado) return c
      const nuevosPagos = [...(c.pagos || []), {
        dia, monto: c.aporte, fecha: new Date().toISOString().split('T')[0]
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

  const pendientes = participantes.filter(p => !p.aprobado && !p.rechazado)
  const aprobados  = participantes.filter(p => p.aprobado && !p.rechazado)

  const lista =
    filtro === 'aprobado'  ? aprobados :
    filtro === 'pendiente' ? pendientes :
    participantes.filter(p => !p.rechazado)

  const totalRecaudado = aprobados.reduce((s, p) =>
    s + (p.creditos || []).reduce((sc, c) =>
      sc + (c.pagos || []).reduce((sp, pg) => sp + pg.monto, 0), 0), 0)

  const pagosHoy = aprobados.filter(p =>
    (p.creditos || []).some(c =>
      (c.pagos || []).some(pg => pg.fecha === new Date().toISOString().split('T')[0])
    )
  ).length

  const fotoLabelNuevo = {
    ciFront: '🪪 CI Anverso', ciBack: '🪪 CI Reverso', selfie: '🤳 Selfie con CI',
    negExt: '🏪 Negocio exterior', negInt: '🏬 Negocio interior'
  }

  // ── FORMULARIO NUEVO PARTICIPANTE ──
  if (mostrarFormNuevo) return (
    <div className="page">
      <div className="top-bar">
        <button onClick={() => { setMostrarFormNuevo(false); setErrorNuevo('') }}
          style={{ background: 'none', color: '#F4C0D1', border: 'none', fontSize: 22 }}>←</button>
        <h1>Nuevo participante</h1>
        <div style={{ width: 40 }} />
      </div>
      <div className="content">

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-title">📋 Datos personales</div>
          <input className="input" placeholder="Nombre completo *" value={nuevoForm.nombre} onChange={e => setNuevo('nombre', e.target.value)} />
          <input className="input" placeholder="Número de CI *" value={nuevoForm.ci} onChange={e => setNuevo('ci', e.target.value)} />
          <input className="input" type="date" value={nuevoForm.fechaNac} onChange={e => setNuevo('fechaNac', e.target.value)} />
          <input className="input" placeholder="Celular (ej: 76710209) *" value={nuevoForm.celular} onChange={e => setNuevo('celular', e.target.value)} />
          <input className="input" placeholder="Domicilio *" value={nuevoForm.domicilio} onChange={e => setNuevo('domicilio', e.target.value)} />
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-title">🏪 Negocio y cuenta</div>
          <input className="input" placeholder="Nombre del negocio *" value={nuevoForm.negocio} onChange={e => setNuevo('negocio', e.target.value)} />
          <input className="input" placeholder="Número de cuenta bancaria *" value={nuevoForm.cuenta} onChange={e => setNuevo('cuenta', e.target.value)} />
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-title">📸 Fotos <span style={{ fontWeight: 400, color: '#999', fontSize: 12 }}>(opcional)</span></div>
          <div className="card" style={{ background: '#FFF8E7', border: '1px solid #F5D77E', padding: 10 }}>
            <p style={{ fontSize: 12, color: '#854F0B' }}>
              ⚠️ Las fotos se enviarán por WhatsApp. Si no las tienes ahora puedes omitirlas.
            </p>
          </div>
          {['ciFront', 'ciBack', 'selfie', 'negExt', 'negInt'].map(id => (
            <div key={id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => capturarFotoNuevo(id)}>
              {nuevoFotos[id]
                ? <img src={nuevoFotos[id].url} alt={id} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }} />
                : <div style={{ width: 50, height: 50, background: '#F4C0D1', borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📷</div>
              }
              <div>
                <p style={{ fontWeight: 600, fontSize: 13 }}>{fotoLabelNuevo[id]}</p>
                <p style={{ fontSize: 11, color: nuevoFotos[id] ? '#27500A' : '#999' }}>
                  {nuevoFotos[id] ? '✅ Foto lista' : 'Toca para agregar (opcional)'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-title">🔐 Acceso a la app</div>
          <input className="input" type="email" placeholder="Correo electrónico *" value={nuevoForm.email} onChange={e => setNuevo('email', e.target.value)} />
          <input className="input" type="password" placeholder="Contraseña (mín. 6 caracteres) *" value={nuevoForm.password} onChange={e => setNuevo('password', e.target.value)} />
          <div className="card" style={{ background: '#F0F4FF', border: '1px solid #C7D7FF', padding: 10 }}>
            <p style={{ fontSize: 12, color: '#3451A0' }}>
              💡 Guarda estas credenciales para dárselas al participante. No podrás verlas después.
            </p>
          </div>
        </div>

        {errorNuevo && <div className="alert-error">{errorNuevo}</div>}

        <button className="btn-primary" onClick={registrarNuevoParticipante} disabled={guardandoNuevo}
          style={{ width: '100%', fontSize: 15, padding: 14 }}>
          {guardandoNuevo ? 'Registrando...' : '✅ Registrar participante'}
        </button>
        <button className="btn-secondary" onClick={() => { setMostrarFormNuevo(false); setErrorNuevo('') }}
          style={{ width: '100%' }}>
          Cancelar
        </button>

      </div>
    </div>
  )

  // ── PERFIL PARTICIPANTE ──
  if (seleccionado) return (
    <div className="page">
      <div className="top-bar">
        <button onClick={() => setSeleccionado(null)}
          style={{ background: 'none', color: '#F4C0D1', border: 'none', fontSize: 22 }}>←</button>
        <h1>Perfil participante</h1>
        <div style={{ width: 40 }} />
      </div>
      <div className="content">

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

        <div className="card">
          <div className="section-title" style={{ marginBottom: 10 }}>Datos personales</div>
          {[
            ['CI', seleccionado.ci],
            ['Celular', seleccionado.celular],
            ['Domicilio', seleccionado.domicilio],
            ['Cuenta', seleccionado.cuenta],
            ['Fecha nac.', seleccionado.fechaNac],
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

        {!seleccionado.aprobado && !seleccionado.rechazado && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">Aprobar crédito</div>
            <div className="form-group">
              <label>Monto total a devolver (Bs)</label>
              <input type="number" placeholder="600" value={monto} onChange={e => setMonto(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Aporte diario (Bs)</label>
              <input type="number" placeholder="25" value={aporte} onChange={e => setAporte(e.target.value)} />
            </div>
            {aporte && monto && parseFloat(aporte) > 0 && (
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC',
                borderRadius: 8, padding: 10, fontSize: 13, color: '#166534' }}>
                💡 Bs {aporte}/día × <strong>{Math.round(parseFloat(monto) / parseFloat(aporte))} días</strong> = Total Bs {monto}
              </div>
            )}
            <div className="form-group">
              <label>Fecha de inicio de pagos</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
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

        {seleccionado.aprobado && (
          <>
            {(seleccionado.creditos || []).map((credito) => {
              const totalPagado = (credito.pagos || []).reduce((s, p) => s + p.monto, 0)
              const diasPagados = (credito.pagos || []).length
              const pct = Math.min(100, Math.round(diasPagados / credito.totalDias * 100))
              return (
                <div key={credito.id} className="card"
                  style={{ border: `2px solid ${credito.completado ? '#C0DD97' : '#F4C0D1'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 10 }}>
                    <div className="section-title" style={{ margin: 0 }}>Crédito #{credito.numero}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                      background: credito.completado ? '#EAF3DE' : '#FDF5F7',
                      color: credito.completado ? '#27500A' : '#4B1528' }}>
                      {credito.completado ? '✅ Completado' : '🔄 En curso'}
                    </span>
                  </div>
                  {[
                    ['Monto total', `Bs ${credito.montoTotal}`],
                    ['Aporte diario', `Bs ${credito.aporte}/día`],
                    ['Fecha inicio', credito.fechaInicio],
                    ['Progreso', `${diasPagados}/${credito.totalDias} días · Bs ${totalPagado} cobrados`],
                  ].map(([k, v]) => (
                    <div key={k} className="info-row">
                      <span className="info-key">{k}</span>
                      <span className="info-val" style={{
                        color: k === 'Monto total' ? '#4B1528' : undefined,
                        fontWeight: k === 'Monto total' ? 700 : undefined }}>{v}</span>
                    </div>
                  ))}
                  <div style={{ background: '#EEE', borderRadius: 20, height: 6, margin: '10px 0' }}>
                    <div style={{ background: credito.completado ? '#97C459' : '#4B1528',
                      width: `${pct}%`, height: '100%', borderRadius: 20, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>
                    {credito.completado ? '🎉 Todos los pagos completados'
                      : 'Toca un día para marcarlo como pagado:'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 4 }}>
                    {Array.from({ length: credito.totalDias }, (_, i) => i + 1).map(d => {
                      const pagado = (credito.pagos || []).find(p => p.dia === d)
                      const cargandoEste = marcandoDia === `${credito.id}-${d}`
                      return (
                        <div key={d}
                          onClick={() => !cargandoEste && !pagado && marcarPago(seleccionado, credito.id, d)}
                          onContextMenu={(e) => { e.preventDefault(); if (pagado) desmarcarPago(seleccionado, credito.id, d) }}
                          title={pagado ? `Pagado el ${pagado.fecha} · Bs ${pagado.monto}` : 'Pendiente'}
                          style={{
                            borderRadius: 6, padding: '5px 2px', textAlign: 'center',
                            fontSize: 10, fontWeight: 700,
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
            <button className="btn-secondary" onClick={() => agregarCredito(seleccionado)}
              style={{ width: '100%' }}>
              ➕ Agregar nuevo crédito
            </button>
          </>
        )}

        <button style={{ background: '#25D366', color: 'white', border: 'none',
          borderRadius: 12, padding: 14, fontSize: 14, fontWeight: 700, width: '100%' }}
          onClick={() => window.open(
            WHATSAPP(seleccionado.celular, `Hola ${seleccionado.nombre}, te contactamos del Pasanaku-IA.`), '_blank'
          )}>
          📲 Contactar por WhatsApp
        </button>

      </div>
    </div>
  )

  // ── PANEL PRINCIPAL ──
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

      {tab === 'panel' && (
        <div className="content">
          <div style={{ background: '#4B1528', borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'rgba(244,192,209,0.7)', marginBottom: 4 }}>Total recaudado</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#F4C0D1' }}>Bs {totalRecaudado.toLocaleString()}</div>
          </div>
          <div className="metric-grid">
            {[
              ['Aprobados', aprobados.length, '#27500A'],
              ['Pagaron hoy', `${pagosHoy}/${aprobados.length}`, undefined],
              ['Pendientes', pendientes.length, '#854F0B'],
              ['Recaudado', `Bs ${totalRecaudado}`, '#27500A'],
            ].map(([label, val, color]) => (
              <div key={label} className="metric-card">
                <div className="metric-label">{label}</div>
                <div className="metric-value" style={{ color, fontSize: label === 'Recaudado' ? 13 : undefined }}>{val}</div>
              </div>
            ))}
          </div>
          {pendientes.length > 0 && (
            <div className="card" style={{ border: '2px solid #FAEEDA' }}>
              <div className="section-title" style={{ color: '#854F0B', marginBottom: 10 }}>
                ⚠️ Solicitudes pendientes ({pendientes.length})
              </div>
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

      {tab === 'participantes' && (
        <div className="content">
          {/* BOTÓN NUEVO PARTICIPANTE */}
          <button className="btn-primary"
            onClick={() => setMostrarFormNuevo(true)}
            style={{ width: '100%', fontSize: 15, padding: 14, marginBottom: 4 }}>
            ➕ Nuevo participante
          </button>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {[['aprobado','Aprobados'], ['pendiente','Pendientes'], ['todos','Todos']].map(([id, label]) => (
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
                ? <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 20 }}>Sin resultados</p>
                : lista.map(p => (
                  <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor: 'pointer' }}>
                    <div className={`avatar ${p.aprobado ? 'av-green' : 'av-amber'}`}>{p.nombre?.charAt(0)}</div>
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
              ? <p style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: 20 }}>Sin participantes aprobados aún</p>
              : aprobados.map(p => {
                  const totalP = (p.creditos || []).reduce((s, c) => s + (c.pagos || []).reduce((sc, pg) => sc + pg.monto, 0), 0)
                  const totalDias = (p.creditos || []).reduce((s, c) => s + c.totalDias, 0)
                  const diasPagados = (p.creditos || []).reduce((s, c) => s + (c.pagos || []).length, 0)
                  const pct = totalDias > 0 ? Math.min(100, Math.round(diasPagados / totalDias * 100)) : 0
                  return (
                    <div key={p.id} className="row" onClick={() => setSeleccionado(p)} style={{ cursor: 'pointer' }}>
                      <div className="avatar av-green">{p.nombre?.charAt(0)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: '#6B6B6B' }}>{diasPagados} pagos · {(p.creditos || []).length} crédito(s)</div>
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
