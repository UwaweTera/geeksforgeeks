import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '../api/client'
import type { AuthView, Submission, Theme, User } from '../types'

const STORAGE = 'geekpath-state-v1'

interface Persisted {
  users: User[]
  sessionId: string | null
  theme: Theme
  bookmarks: string[]
  solved: string[]
  attempted: string[]
  enrollments: string[]
  xp: number
  streak: number
  lastPotd: string | null
  submissions: Submission[]
  pendingEmail: string | null
}

const seedUsers: User[] = [
  {
    id: 'u-admin',
    name: 'Amina Admin',
    email: 'admin@geekpath.dev',
    password: 'admin123',
    role: 'admin',
    bio: 'Platform operator',
    country: 'Rwanda',
    university: 'GeekPath',
    education: 'Staff',
    skillLevel: 'Advanced',
    interests: ['Platform'],
    github: '',
    linkedin: '',
    website: '',
    twoFactor: false,
    emailVerified: true,
    phone: '',
    whatsappOptIn: false,
    createdAt: '2025-01-01',
  },
  {
    id: 'u-student',
    name: 'Fred N.',
    email: 'student@geekpath.dev',
    password: 'password123',
    role: 'student',
    bio: 'Learning DSA and web development.',
    country: 'Rwanda',
    university: 'University of Rwanda',
    education: 'Undergraduate',
    skillLevel: 'Intermediate',
    interests: ['DSA', 'React'],
    github: 'fredn',
    linkedin: '',
    website: '',
    twoFactor: false,
    emailVerified: true,
    phone: '',
    whatsappOptIn: false,
    createdAt: '2026-02-10',
  },
  {
    id: 'u-instructor',
    name: 'Coach Maya',
    email: 'instructor@geekpath.dev',
    password: 'teach123',
    role: 'instructor',
    bio: 'Live course mentor and content creator.',
    country: 'India',
    university: 'GeeksforGeeks',
    education: 'Mentor',
    skillLevel: 'Advanced',
    interests: ['Teaching', 'DSA'],
    github: '',
    linkedin: '',
    website: '',
    twoFactor: false,
    emailVerified: true,
    phone: '',
    whatsappOptIn: false,
    createdAt: '2025-06-01',
  },
]

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted
      if (!parsed.users?.length) parsed.users = seedUsers
      return parsed
    }
  } catch {
    /* ignore */
  }
  return {
    users: seedUsers,
    sessionId: null,
    theme: 'light',
    bookmarks: [],
    solved: [],
    attempted: [],
    enrollments: [],
    xp: 120,
    streak: 3,
    lastPotd: null,
    submissions: [],
    pendingEmail: null,
  }
}

interface AppContextValue {
  theme: Theme
  toggleTheme: () => void
  user: User | null
  users: User[]
  apiOnline: boolean
  authOpen: boolean
  authView: AuthView
  openAuth: (view?: AuthView) => void
  closeAuth: () => void
  setAuthView: (view: AuthView) => void
  login: (email: string, password: string) => Promise<string | null>
  loginWithGoogle: (payload: { accessToken?: string; credential?: string }) => Promise<string | null>
  register: (input: Partial<User> & { email: string; password: string; name: string }) => Promise<string | null>
  logout: () => void
  updateUser: (patch: Partial<User>) => void
  startReset: (email: string) => Promise<string | null>
  confirmOtp: (code: string) => Promise<string | null>
  resendOtp: () => Promise<string | null>
  resetPassword: (password: string) => Promise<boolean>
  verifyEmail: () => Promise<void>
  finishTwoFactor: (code: string) => Promise<boolean>
  otpPurpose: 'verify' | 'reset' | '2fa'
  bookmarks: string[]
  toggleBookmark: (id: string) => void
  solved: string[]
  attempted: string[]
  markAttempt: (id: string) => void
  markSolved: (id: string) => void
  enrollments: string[]
  enroll: (id: string, extra?: {
    phone?: string
    whatsappOptIn?: boolean
    amount?: string
    paymentMethod?: string
    cardLast4?: string
  }) => void
  xp: number
  addXp: (n: number) => void
  streak: number
  claimPotd: () => void
  submissions: Submission[]
  addSubmission: (row: Submission) => void
  pendingEmail: string | null
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => load())
  const [authOpen, setAuthOpen] = useState(false)
  const [authView, setAuthView] = useState<AuthView>('login')
  const [apiOnline, setApiOnline] = useState(false)
  const [otpPurpose, setOtpPurpose] = useState<'verify' | 'reset' | '2fa'>('verify')
  const [verifiedOtp, setVerifiedOtp] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(state))
    document.documentElement.dataset.theme = state.theme
  }, [state])

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      try {
        const health = await api<{ ok: boolean }>('/health')
        if (cancelled || !health.ok) return
        setApiOnline(true)
        if (!getToken()) return
        const me = await api<{ user: User }>('/auth/me').catch(() => null)
        if (!me || cancelled) return
        const dash = await api<{
          xp: number
          streak: number
          solved: string[]
          attempted: string[]
          enrollments: string[]
          bookmarks: string[]
          submissions: Submission[]
        }>('/me/dashboard')
        if (cancelled) return
        setState((prev) => ({
          ...prev,
          users: [me.user, ...prev.users.filter((u) => u.id !== me.user.id)],
          sessionId: me.user.id,
          xp: dash.xp,
          streak: dash.streak,
          solved: dash.solved,
          attempted: dash.attempted,
          enrollments: dash.enrollments,
          bookmarks: dash.bookmarks,
          submissions: dash.submissions,
        }))
      } catch {
        setApiOnline(false)
      }
    }
    hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  const user = state.users.find((u) => u.id === state.sessionId) ?? null
  const patch = (fn: (prev: Persisted) => Persisted) => setState((prev) => fn({ ...prev }))

  async function applySession(nextUser: User) {
    try {
      const dash = await api<{
        xp: number
        streak: number
        solved: string[]
        attempted: string[]
        enrollments: string[]
        bookmarks: string[]
        submissions: Submission[]
      }>('/me/dashboard')
      patch((p) => ({
        ...p,
        users: [nextUser, ...p.users.filter((u) => u.id !== nextUser.id)],
        sessionId: nextUser.id,
        xp: dash.xp,
        streak: dash.streak,
        solved: dash.solved,
        attempted: dash.attempted,
        enrollments: dash.enrollments,
        bookmarks: dash.bookmarks,
        submissions: dash.submissions,
      }))
    } catch {
      patch((p) => ({
        ...p,
        users: [nextUser, ...p.users.filter((u) => u.id !== nextUser.id)],
        sessionId: nextUser.id,
      }))
    }
  }

  const value = useMemo<AppContextValue>(() => ({
    theme: state.theme,
    toggleTheme: () => patch((p) => ({ ...p, theme: p.theme === 'light' ? 'dark' : 'light' })),
    user,
    users: state.users,
    apiOnline,
    authOpen,
    authView,
    openAuth: (view = 'login') => {
      setAuthView(view)
      setAuthOpen(true)
    },
    closeAuth: () => setAuthOpen(false),
    setAuthView,
    login: async (email, password) => {
      try {
        const data = await api<{ token?: string; user?: User; twoFactor?: boolean; needsVerification?: boolean; email?: string }>('/auth/login', {
          method: 'POST',
          body: { email, password },
        })
        setApiOnline(true)
        if (data.needsVerification) {
          patch((p) => ({ ...p, pendingEmail: data.email || email }))
          setOtpPurpose('verify')
          setAuthView('otp')
          return null
        }
        if (data.twoFactor) {
          patch((p) => ({ ...p, pendingEmail: data.email || email }))
          setOtpPurpose('2fa')
          setAuthView('otp')
          return null
        }
        if (data.token && data.user) {
          setToken(data.token)
          await applySession(data.user)
          setAuthOpen(false)
        }
        return null
      } catch {
        const found = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
        if (!found) return 'Invalid email or password. Start the backend and MySQL, or use a demo account.'
        if (found.twoFactor) {
          patch((p) => ({ ...p, pendingEmail: found.email }))
          setAuthView('twoFactor')
          return null
        }
        patch((p) => ({ ...p, sessionId: found.id }))
        setAuthOpen(false)
        return null
      }
    },
    loginWithGoogle: async (payload) => {
      try {
        const data = await api<{ token: string; user: User }>('/auth/google', {
          method: 'POST',
          body: payload,
        })
        setToken(data.token)
        await applySession(data.user)
        setAuthOpen(false)
        return null
      } catch (error) {
        return error instanceof Error ? error.message : 'Google sign-in failed.'
      }
    },
    register: async (input) => {
      try {
        await api('/auth/register', {
          method: 'POST',
          body: {
            name: input.name,
            email: input.email,
            password: input.password,
            university: input.university,
            phone: input.phone,
            whatsappOptIn: input.whatsappOptIn,
          },
        })
        patch((p) => ({ ...p, pendingEmail: input.email }))
        setOtpPurpose('verify')
        setAuthView('otp')
        return null
      } catch (error) {
        return error instanceof Error ? error.message : 'Could not create the account.'
      }
    },
    logout: () => {
      setToken(null)
      patch((p) => ({ ...p, sessionId: null }))
    },
    updateUser: (userPatch) => {
      patch((p) => ({
        ...p,
        users: p.users.map((u) => (u.id === p.sessionId ? { ...u, ...userPatch } : u)),
      }))
      api('/auth/me', { method: 'PATCH', body: userPatch }).catch(() => undefined)
    },
    startReset: async (email) => {
      try {
        await api('/auth/forgot', { method: 'POST', body: { email } })
        patch((p) => ({ ...p, pendingEmail: email }))
        setOtpPurpose('reset')
        setAuthView('otp')
        return null
      } catch (error) {
        return error instanceof Error ? error.message : 'Could not send the reset code.'
      }
    },
    confirmOtp: async (code) => {
      try {
        if (otpPurpose === 'verify') {
          const data = await api<{ token: string; user: User }>('/auth/verify-email', {
            method: 'POST',
            body: { email: state.pendingEmail, otp: code },
          })
          setToken(data.token)
          await applySession(data.user)
          patch((p) => ({ ...p, pendingEmail: null }))
          setAuthView('setup')
          return null
        }
        if (otpPurpose === '2fa') {
          const data = await api<{ token: string; user: User }>('/auth/two-factor', {
            method: 'POST',
            body: { email: state.pendingEmail, otp: code },
          })
          setToken(data.token)
          await applySession(data.user)
          patch((p) => ({ ...p, pendingEmail: null }))
          setAuthOpen(false)
          return null
        }
        await api('/auth/otp', { method: 'POST', body: { email: state.pendingEmail, otp: code, purpose: 'reset' } })
        setVerifiedOtp(code)
        setAuthView('reset')
        return null
      } catch (error) {
        return error instanceof Error ? error.message : 'Incorrect or expired OTP.'
      }
    },
    resendOtp: async () => {
      if (!state.pendingEmail) return 'No email to send to.'
      try {
        await api('/auth/resend-otp', { method: 'POST', body: { email: state.pendingEmail, purpose: otpPurpose } })
        return null
      } catch (error) {
        return error instanceof Error ? error.message : 'Could not resend the code.'
      }
    },
    resetPassword: async (password) => {
      if (!state.pendingEmail) return false
      try {
        await api('/auth/reset', { method: 'POST', body: { email: state.pendingEmail, password, otp: verifiedOtp } })
        patch((p) => ({ ...p, pendingEmail: null }))
        setAuthView('login')
        return true
      } catch {
        return false
      }
    },
    verifyEmail: async () => undefined,
    finishTwoFactor: async (code) => {
      try {
        const data = await api<{ token: string; user: User }>('/auth/two-factor', {
          method: 'POST',
          body: { email: state.pendingEmail, otp: code },
        })
        setToken(data.token)
        await applySession(data.user)
        patch((p) => ({ ...p, pendingEmail: null }))
        setAuthOpen(false)
        return true
      } catch {
        if (code.trim() !== '123456') return false
        const found = state.users.find((u) => u.email === state.pendingEmail)
        if (!found) return false
        patch((p) => ({ ...p, sessionId: found.id, pendingEmail: null }))
        setAuthOpen(false)
        return true
      }
    },
    bookmarks: state.bookmarks,
    toggleBookmark: (id) => {
      patch((p) => ({
        ...p,
        bookmarks: p.bookmarks.includes(id) ? p.bookmarks.filter((x) => x !== id) : [...p.bookmarks, id],
      }))
      api('/me/bookmarks', { method: 'POST', body: { id } }).catch(() => undefined)
    },
    solved: state.solved,
    attempted: state.attempted,
    markAttempt: (id) => {
      patch((p) => ({ ...p, attempted: p.attempted.includes(id) ? p.attempted : [...p.attempted, id] }))
      api('/me/progress', { method: 'POST', body: { problemId: id, solved: false } }).catch(() => undefined)
    },
    markSolved: (id) => {
      patch((p) => ({
        ...p,
        solved: p.solved.includes(id) ? p.solved : [...p.solved, id],
        xp: p.xp + (p.solved.includes(id) ? 0 : 25),
      }))
      api('/me/progress', { method: 'POST', body: { problemId: id, solved: true } }).catch(() => undefined)
    },
    enrollments: state.enrollments,
    enroll: (id, extra) => {
      patch((p) => ({
        ...p,
        enrollments: p.enrollments.includes(id) ? p.enrollments : [...p.enrollments, id],
      }))
      if (extra?.phone != null) {
        patch((p) => ({
          ...p,
          users: p.users.map((u) => (u.id === p.sessionId ? { ...u, phone: extra.phone || '', whatsappOptIn: extra.whatsappOptIn !== false } : u)),
        }))
      }
      api('/me/enroll', {
        method: 'POST',
        body: {
          courseId: id,
          phone: extra?.phone,
          whatsappOptIn: extra?.whatsappOptIn !== false,
          amount: extra?.amount,
          paymentMethod: extra?.paymentMethod,
          cardLast4: extra?.cardLast4,
        },
      }).catch(() => undefined)
    },
    xp: state.xp,
    addXp: (n) => {
      patch((p) => ({ ...p, xp: p.xp + n }))
      api('/me/xp', { method: 'POST', body: { n } }).catch(() => undefined)
    },
    streak: state.streak,
    claimPotd: () => {
      const today = new Date().toISOString().slice(0, 10)
      patch((p) => ({
        ...p,
        lastPotd: today,
        streak: p.lastPotd === today ? p.streak : p.streak + 1,
        xp: p.xp + 15,
      }))
      api('/me/potd', { method: 'POST' }).catch(() => undefined)
    },
    submissions: state.submissions,
    addSubmission: (row) => {
      patch((p) => ({ ...p, submissions: [row, ...p.submissions].slice(0, 40) }))
      api('/me/submissions', { method: 'POST', body: row }).catch(() => undefined)
    },
    pendingEmail: state.pendingEmail,
    otpPurpose,
  }), [state, user, authOpen, authView, apiOnline, otpPurpose, verifiedOtp])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
