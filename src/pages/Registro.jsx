import { useState } from 'react'
import { auth, db } from '../firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

const WHATSAPP_ADMIN = '59170012345'

export default function Registro({ onVolver }) {
  const [paso, setPaso] = useState(1)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [fotos, setFotos] = useState({})
  const [form, setForm] = useState({
    nombre: '', ci: '', fechaNac: '', celular: '',
    domicilio: '', cuenta: '', negocio: '',
    email: '', password: ''
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const marcarFoto = (id) => setFotos(f => ({ ...f, [id]: true }))

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
        aprobado: false,
        turno: null,
        monto: null,
        fechaTransferencia: null,
        pagos: [],
        creadoEn: serverTimestamp()
      })
      setPaso(4)
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'Este correo ya está registrado' : 'Error al registrar. Intenta de nuevo.')
    }
    setCargando(false)
  }

  const enviarWhatsApp = () => {
    const msg = `🆕 *Nuevo registro - Pasanaku-IA*\n\n👤 *Nombre:* ${form.nombre}\n🪪 *CI:* ${form.ci}\n📅 *Fecha nac.:* ${form.fechaNac}\n📍 *Domicilio:* ${form.domicilio}\n📱 *Celular:* ${form.celular}\n🏪 *Negocio:* ${form.negocio}\n🏦 *Cuenta:* ${form.cuenta}\n📧 *Email:* ${form.email}\n\n📎 Documentos subidos en la app`
    window.open(`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(msg)}`)
  }

  const steps = ['Datos', 'Identidad', 'Negocio', 'Listo']

  return (
    <div className="page">
      <div className="top-bar">
        {paso < 4 && <button onClick={paso === 1 ? onVolver : () => setPaso(p => p-1)} style={{ background:'none', color:'#F4C0D1', fontSize:22, border:'none' }}>←</button>}
        <h1>Registro Pasanaku</h1>
      </div>

      {paso < 4 && (
        <div style={{ display:'flex', padding:'12px 16px', gap:4, alignItems:'center' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', flex: i < steps.length-1 ? 1 : 0 }}>
              <div style={{
                width:28, height:28, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:12, fontWeight:700, flexShrink:0,
                background: i+1 < paso ? '#EAF3DE' : i+1 === paso ? '#4B1528' : '#EEE',
                color: i+1 < paso ? '#27500A' : i+1 === paso ? '#F4C0D1' : '#AAA'
              }}>
                {i+1 < paso ? '✓' : i+1}
              </div>
              {i < steps.length-1 && <div style={{ flex:1, height:2, background: i+1 < paso ? '#C0DD97' : '#EEE', margin:'0 4px' }} />}
            </div>
          ))}
        </div>
      )}

      <div className="content">
        {paso === 1 && (
          <>
            <div>
              <div className="section-title">Datos personales</div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="form-group"><label>Nombre completo</label><input value={form.nombre} onChange={e=>set('nombre',e.target.value)} placeholder="Juan Carlos Pérez" /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className="form-group"><label>N° de CI</label><input value={form.ci} onChange={e=>set('ci',e.target.value)} placeholder="7654321" /></div>
                <div className="form-group"><label>Fecha de nac.</label><input type="date" value={form.fechaNac} onChange={e=>set('fechaNac',e.target.value)} /></div>
              </div>
              <div className="form-group"><label>Celular</label><input value={form.celular} onChange={e=>set('celular',e.target.value)} placeholder="+591 70012345" /></div>
              <div className="form-group"><label>Domicilio</label><input value={form.domicilio} onChange={e=>set('domicilio',e.target.value)} placeholder="Av. Camacho #345, La Paz" /></div>
              <div className="form-group"><label>N° de cuenta o QR de billetera</label><input value={form.cuenta} onChange={e=>set('cuenta',e.target.value)} placeholder="Banco Unión - 10045678" /></div>
              <div className="form-group"><label>Correo electrónico</label><input type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="tucorreo@gmail.com" /></div>
              <div className="form-group"><label>Contraseña (mín. 6 caracteres)</label><input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="••••••••" /></div>
            </div>
            <button className="btn-primary" onClick={() => {
              if (!form.nombre || !form.ci || !form.celular || !form.email || !form.password) { setError('Completa todos los campos'); return }
              setError(''); setPaso(2)
            }}>Continuar</button>
          </>
        )}

        {paso === 2 && (
          <>
            <div><div className="section-title">Verificación de identidad</div></div>
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <p style={{ fontSize:13, color:'#6B6B6B' }}>Toca cada recuadro para subir la foto correspondiente</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className={`upload-box ${fotos['ci-front'] ? 'done' : ''}`} onClick={() => marcarFoto('ci-front')}>
                  <div style={{ fontSize:28 }}>🪪</div>
                  <div style={{ fontSize:12, marginTop:6, color: fotos['ci-front'] ? '#27500A' : '#6B6B6B', fontWeight: fotos['ci-front'] ? 700 : 400 }}>
                    {fotos['ci-front'] ? 'CI anverso ✓' : 'CI anverso'}
                  </div>
                </div>
                <div className={`upload-box ${fotos['ci-back'] ? 'done' : ''}`} onClick={() => marcarFoto('ci-back')}>
                  <div style={{ fontSize:28 }}>🪪</div>
                  <div style={{ fontSize:12, marginTop:6, color: fotos['ci-back'] ? '#27500A' : '#6B6B6B', fontWeight: fotos['ci-back'] ? 700 : 400 }}>
                    {fotos['ci-back'] ? 'CI reverso ✓' : 'CI reverso'}
                  </div>
                </div>
              </div>
              <div className={`upload-box ${fotos['selfie'] ? 'done' : ''}`} onClick={() => marcarFoto('selfie')} style={{ padding:24 }}>
                <div style={{ fontSize:32 }}>🤳</div>
                <div style={{ fontSize:13, marginTop:8, color: fotos['selfie'] ? '#27500A' : '#6B6B6B', fontWeight: fotos['selfie'] ? 700 : 400 }}>
                  {fotos['selfie'] ? 'Selfie con CI ✓' : 'Selfie sosteniendo tu CI'}
                </div>
                <div style={{ fontSize:11, color:'#AAA', marginTop:4 }}>Cara y CI deben ser visibles</div>
              </div>
              <div className="alert alert-info">Tus fotos son solo para verificación del administrador.</div>
            </div>
            <button className="btn-primary" onClick={() => setPaso(3)}>Continuar</button>
          </>
        )}

        {paso === 3 && (
          <>
            <div><div className="section-title">Datos del negocio</div></div>
            <div className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="form-group"><label>Nombre del negocio</label><input value={form.negocio} onChange={e=>set('negocio',e.target.value)} placeholder="Tienda Don Juan" /></div>
              <div style={{ background:'#E1F5EE', borderRadius:10, padding:16, textAlign:'center', border:'1px solid #9FE1CB' }}>
                <div style={{ fontSize:28 }}>📍</div>
                <div style={{ fontSize:13, color:'#0F6E56', fontWeight:600, marginTop:6 }}>Toca para capturar ubicación GPS</div>
                <div style={{ fontSize:11, color:'#0F6E56', marginTop:3 }}>La app detectará tu ubicación automáticamente</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div className={`upload-box ${fotos['neg-ext'] ? 'done' : ''}`} onClick={() => marcarFoto('neg-ext')}>
                  <div style={{ fontSize:26 }}>🏪</div>
                  <div style={{ fontSize:11, marginTop:6, color: fotos['neg-ext'] ? '#27500A' : '#6B6B6B' }}>
                    {fotos['neg-ext'] ? 'Exterior ✓' : 'Foto exterior'}
                  </div>
                </div>
                <div className={`upload-box ${fotos['neg-int'] ? 'done' : ''}`} onClick={() => marcarFoto('neg-int')}>
                  <div style={{ fontSize:26 }}>🏬</div>
                  <div style={{ fontSize:11, marginTop:6, color: fotos['neg-int'] ? '#27500A' : '#6B6B6B' }}>
                    {fotos['neg-int'] ? 'Interior ✓' : 'Foto interior'}
                  </div>
                </div>
              </div>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <button className="btn-primary" disabled={cargando} onClick={() => {
              if (!form.negocio) { setError('Ingresa el nombre del negocio'); return }
              handleRegistro()
            }}>
              {cargando ? 'Registrando...' : 'Finalizar registro'}
            </button>
          </>
        )}

        {paso === 4 && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center', paddingTop:24 }}>
            <div style={{ width:72, height:72, borderRadius:'50%', background:'#EAF3DE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:32 }}>✅</div>
            <h2 style={{ color:'#4B1528', fontSize:22 }}>¡Registro completado!</h2>
            <p style={{ color:'#6B6B6B', lineHeight:1.7, fontSize:14 }}>Tu solicitud fue enviada. Ahora envía tus datos al administrador por WhatsApp para que pueda revisarlos.</p>
            <button className="btn-primary" style={{ background:'#25D366', marginTop:8 }} onClick={enviarWhatsApp}>
              📲 Enviar datos por WhatsApp
            </button>
            <div className="card" style={{ width:'100%', textAlign:'left' }}>
              <div className="section-title" style={{ marginBottom:10 }}>¿Qué sigue?</div>
              <div style={{ fontSize:13, color:'#6B6B6B', lineHeight:2 }}>
                1. El administrador revisará tus datos<br/>
                2. Recibirás aprobación en persona<br/>
                3. Se te asignará tu turno y monto<br/>
                4. Podrás iniciar tus pagos diarios
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
