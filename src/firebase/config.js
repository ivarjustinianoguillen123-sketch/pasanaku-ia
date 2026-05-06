import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyCLPWS88_fhpuppYaBXiEGsn3G-yt9p1Wc",
  authDomain: "pasanaku-ia.firebaseapp.com",
  projectId: "pasanaku-ia",
  storageBucket: "pasanaku-ia.firebasestorage.app",
  messagingSenderId: "299328530643",
  appId: "1:299328530643:web:d1fb6e62d4fd53b95b8c26",
  measurementId: "G-N6RW1D2XQN"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
