import { useState } from 'react'
import { auth, db } from '../firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const WHATSAPP_ADMIN = '59176710209'

export default function Registro({ onVolver }) {
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [fotos, setFotos] = useState({ ciFront: null, ciBack: null, selfie: null, negExt: null, negInt: null })
  const [ubicacion, setUbicacion] = useState(null)
  const [cargandoUbic, setCargandoUbic] = useState(false)
  const [form, setForm] = useState({
    nombre: '', ci: '', fechaNac: '', celular: '', domicilio: '',
    cuenta: '', negocio: '', email: '', password: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const capturarFoto = (id) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const url = URL.createObjectURL(file)
        setFotos(f => ({ ...f, [id]: { file, url } }))
      }
    }
    input.click()
  }

  const capturarUbicacion = () => {
    setCargandoUbic(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUbicacion({ lat, lng, link: `https://maps.google.com/?q=${lat},${lng}` })
        setCargandoUbic(false)
      },
      () => {
        alert('No se pudo obtener la ubicación. Verifica los permisos.')
        setCargandoUbic(false)
      }
    )
  }

  const validarPaso1 = () => {
    if (!form.nombre || !form.ci || !form.fechaNac || !form.celular || !form.domicilio)
      return 'Completa todos los campos del paso 1'
    return ''
  }

  const validarPaso2 = () => {
    if (!fotos.ciFront || !fotos.ciBack || !fotos.selfie)
      return 'Sube las 3 fotos de identidad'
    return ''
  }

  const validarPaso3 = () => {
    if (!form.cuenta || !form.negocio || !form.email || !form.password)
      return 'Completa todos los campos del paso 3'
    if (form.password.length < 6)
      return 'La contraseña debe tener al menos 6 caracteres'
    return ''
  }

  const handleRegistro = async () => {
    setCargando(true)
    setError('')
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await setDoc(doc(db, 'participantes', cred.user.uid), {
        uid: cred.user.uid,
        nombre: form.nombre,
        ci: form.ci,
        fechaNac: form.fechaNac,
        celular: form.celular,
        domicilio: form.domicilio,
        cuenta: form.cuenta,
        negocio: form.negocio,
        email: form.email,
        ubicacion: ubicacion || null,
        aprobado: false,
        rechazado: false,
        turno: null,
        monto: null,
        fechaTransferencia: null,
        pagos: [],
        creadoEn: serverTimestamp()
      })

      const msg =
`🆕 *NUEVO REGISTRO - Pasanaku-IA*

👤 *Nombre:* ${form.nombre}
🪪 *CI:* ${form.ci}
📅 *Fecha nac.:* ${form.fechaNac}
📱 *Celular:* ${form.celular}
📍 *Domicilio:* ${form.domicilio}
🏪 *Negocio:* ${form.negocio}
🏦 *Cuenta:* ${form.cuenta}
📧 *Email:* ${form.email}
${ubicacion ? `\n📌 *Ubicación GPS:* ${ubicacion.link}` : '\n📌 *Ubicación:* No proporcionada'}

📎 Por favor envía también las fotos de CI y negocio en este chat.

✅ Datos guardados en sistema Pasanaku-IA`

      window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(msg)}`, '_blank')
      setPaso(4)

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Este correo ya está registrado.')
      else if (err.code === 'auth/weak-password') setError('La contraseña es muy débil.')
      else if (err.code === 'auth/invalid-email') setError('El correo no es válido.')
      else setError('Ocurrió un error. Intenta de nuevo.')
    }
    setCargando(false)
  }

  const fotoLabel = {
    ciFront: '🪪 CI Anverso',
    ciBack: '🪪 CI Reverso',
    selfie: '🤳 Selfie con CI',
    negExt: '🏪 Negocio exterior',
    negInt: '🏬 Negocio interior'
  }

  return (
    <div className="page">
      <div style={{ background: 'linear-gradient(160deg,#4B1528 0%,#2D0D18 100%)', padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onVolver} style={{ background: 'none', border: 'none', color: '#F4C0D1', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div>
          <h2 style={{ color: '#F4C0D1', fontSize: 18, fontWeight: 700 }}>Registro al Pasanaku</h2>
          <p style={{ color: 'rgba(244,192,209,0.7)', fontSize: 12 }}>Paso {paso} de 4</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, padding: '12px 20px', background: '#fff' }}>
        {[1,2,3,4].map(n => (
          <div key={n} style={{ flex: 1, height: 4, borderRadius: 2, background: paso >= n ? '#4B1528' : '#E5E5E5' }} />
        ))}
      </div>

      <div className="content">

        {paso === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">📋 Datos personales</div>
            <input className="input" placeholder="Nombre completo *" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
            <input className="input" placeholder="Número de CI *" value={form.ci} onChange={e => set('ci', e.target.value)} />
            <input className="input" type="date" placeholder="Fecha de nacimiento *" value={form.fechaNac} onChange={e => set('fechaNac', e.target.value)} />
            <input className="input" placeholder="Celular (ej: 76710209) *" value={form.celular} onChange={e => set('celular', e.target.value)} />
            <input className="input" placeholder="Domicilio *" value={form.domicilio} onChange={e => set('domicilio', e.target.value)} />
            <div className="card" style={{ background: '#F5F5F5' }}>
              <p style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>📌 Ubicación GPS (opcional pero recomendado)</p>
              {ubicacion
                ? <p style={{ fontSize: 12, color: '#27500A' }}>✅ Ubicación capturada correctamente</p>
                : <button className="btn-secondary" onClick={capturarUbicacion} disabled={cargandoUbic}>
                    {cargandoUbic ? 'Obteniendo ubicación...' : '📍 Capturar mi ubicación'}
                  </button>
              }
            </div>
            {error && <div className="alert-error">{error}</div>}
            <button className="btn-primary" onClick={() => { const e = validarPaso1(); if (e) { setError(e); return; } setError(''); setPaso(2) }}>
              Siguiente →
            </button>
          </div>
        )}

        {paso === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">📸 Fotos de identidad</div>
            <p style={{ fontSize: 13, color: '#666' }}>Sube las fotos desde tu galería o toma una foto ahora.</p>
            {['ciFront', 'ciBack', 'selfie'].map(id => (
              <div key={id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => capturarFoto(id)}>
                {fotos[id]
                  ? <img src={fotos[id].url} alt={id} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                  : <div style={{ width: 60, height: 60, background: '#F4C0D1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
                }
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{fotoLabel[id]}</p>
                  <p style={{ fontSize: 12, color: fotos[id] ? '#27500A' : '#999' }}>{fotos[id] ? '✅ Foto cargada' : 'Toca para agregar'}</p>
                </div>
              </div>
            ))}
            {error && <div className="alert-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setError(''); setPaso(1) }}>← Volver</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={() => { const e = validarPaso2(); if (e) { setError(e); return; } setError(''); setPaso(3) }}>Siguiente →</button>
            </div>
          </div>
        )}

        {paso === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-title">🏪 Negocio y cuenta</div>
            <input className="input" placeholder="Nombre del negocio *" value={form.negocio} onChange={e => set('negocio', e.target.value)} />
            <input className="input" placeholder="Número de cuenta bancaria *" value={form.cuenta} onChange={e => set('cuenta', e.target.value)} />
            {['negExt', 'negInt'].map(id => (
              <div key={id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => capturarFoto(id)}>
                {fotos[id]
                  ? <img src={fotos[id].url} alt={id} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8 }} />
                  : <div style={{ width: 60, height: 60, background: '#F4C0D1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
                }
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{fotoLabel[id]}</p>
                  <p style={{ fontSize: 12, color: fotos[id] ? '#27500A' : '#999' }}>{fotos[id] ? '✅ Foto cargada' : 'Toca para agregar (opcional)'}</p>
                </div>
              </div>
            ))}
            <div className="section-title" style={{ marginTop: 8 }}>🔐 Acceso a la app</div>
            <input className="input" type="email" placeholder="Correo electrónico *" value={form.email} onChange={e => set('email', e.target.value)} />
            <input className="input" type="password" placeholder="Contraseña (mín. 6 caracteres) *" value={form.password} onChange={e => set('password', e.target.value)} />
            {error && <div className="alert-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setError(''); setPaso(2) }}>← Volver</button>
              <button className="btn-primary" style={{ flex: 2 }} onClick={async () => { const e = validarPaso3(); if (e) { setError(e); return; } await handleRegistro() }} disabled={cargando}>
                {cargando ? 'Registrando...' : 'Finalizar registro ✓'}
              </button>
            </div>
          </div>
        )}

        {paso === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64 }}>🎉</div>
            <h2 style={{ color: '#4B1528', fontSize: 22 }}>¡Registro completado!</h2>
            <p style={{ color: '#666', lineHeight: 1.6 }}>
              Tus datos fueron guardados. Ahora envía tu información al administrador por WhatsApp para completar el proceso.
            </p>
            <div className="card" style={{ background: '#F0FDF4', border: '1px solid #86EFAC', width: '100%' }}>
              <p style={{ fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                📱 Al hacer clic en el botón se abrirá WhatsApp con todos tus datos listos para enviar. Luego <strong>envía también tus fotos</strong> en el mismo chat.
              </p>
            </div>
            <button
              className="btn-primary"
              style={{ width: '100%', background: '#25D366', fontSize: 16, padding: '14px' }}
              onClick={() => {
                const msg =
`🆕 *NUEVO REGISTRO - Pasanaku-IA*

👤 *Nombre:* ${form.nombre}
🪪 *CI:* ${form.ci}
📅 *Fecha nac.:* ${form.fechaNac}
📱 *Celular:* ${form.celular}
📍 *Domicilio:* ${form.domicilio}
🏪 *Negocio:* ${form.negocio}
🏦 *Cuenta:* ${form.cuenta}
📧 *Email:* ${form.email}
${ubicacion ? `\n📌 *Ubicación GPS:* ${ubicacion.link}` : '\n📌 *Ubicación:* No proporcionada'}

📎 Por favor envía también las fotos de CI y negocio en este chat.

✅ Datos guardados en sistema Pasanaku-IA`
                window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(msg)}`, '_blank')
              }}
            >
              📲 Enviar datos por WhatsApp
            </button>
            <p style={{ fontSize: 12, color: '#999' }}>
              El administrador revisará tu solicitud y te notificará cuando seas aprobado.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
