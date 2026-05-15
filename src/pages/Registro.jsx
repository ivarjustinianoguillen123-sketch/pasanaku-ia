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

    // Abrir WhatsApp automáticamente antes de cambiar pantalla
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
