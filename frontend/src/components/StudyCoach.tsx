import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, X } from 'lucide-react'
import { api, getToken } from '../api/client'
import { useApp } from '../context/AppContext'

type Alert = {
  id: string
  kind: string
  title: string
  body: string
  courseId?: string | null
  channel: string
  createdAt: string
  readAt?: string | null
}

export function StudyCoach() {
  const { user } = useApp()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [seen, setSeen] = useState<string>('')

  useEffect(() => {
    if (!user || user.role !== 'student' || !getToken()) {
      setAlert(null)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const data = await api<{ alerts: Alert[] }>('/me/alerts')
        const next = (data.alerts || []).find((item) => !item.readAt)
        if (cancelled || !next || next.id === seen) return
        setAlert(next)
        setSeen(next.id)
        api('/me/alerts/read', { method: 'POST', body: { id: next.id } }).catch(() => undefined)
      } catch {
        /* ignore until signed in */
      }
    }

    load()
    const timer = window.setInterval(load, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [user, seen])

  if (!alert) return null

  const courseMatch = alert.body.match(/https?:\/\/\S+/)
  const href = courseMatch?.[0] || '/courses'

  return (
    <aside className="wa-toast" role="status">
      <div className="wa-toast-head">
        <span className="wa-dot" />
        <strong>WhatsApp study coach</strong>
        <button type="button" className="wa-toast-x" onClick={() => setAlert(null)} aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
      <h4>{alert.title}</h4>
      <p>{alert.body.replace(/https?:\/\/\S+/g, '').trim()}</p>
      <Link className="btn btn-green btn-sm" to={href.replace(/^https?:\/\/[^/]+/, '') || '/courses'} onClick={() => setAlert(null)}>
        <BookOpen size={14} /> Open course
      </Link>
    </aside>
  )
}
