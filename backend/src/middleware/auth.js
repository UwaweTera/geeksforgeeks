import jwt from 'jsonwebtoken'

export function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET || 'geekpath-dev-secret',
    { expiresIn: '7d' },
  )
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Sign in required.' })
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'geekpath-dev-secret')
    next()
  } catch {
    return res.status(401).json({ message: 'Session expired. Sign in again.' })
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin only.' })
  next()
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return next()
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'geekpath-dev-secret')
  } catch {
    req.user = null
  }
  next()
}
