import { auth } from './firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth'

export async function signUpWithEmail(email: string, password: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (cred.user && !cred.user.emailVerified) {
    await sendEmailVerification(cred.user)
  }
  return cred.user
}

export async function signInWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  return cred.user
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null
  return await user.getIdToken(forceRefresh)
}

export function observeAuthState(cb: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, cb)
}

export async function logout() {
  await signOut(auth)
}


