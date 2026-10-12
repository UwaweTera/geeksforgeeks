import { OAuth2Client } from 'google-auth-library'

const clientId = () => process.env.GOOGLE_CLIENT_ID

export async function googleProfile({ credential, accessToken }) {
  if (credential) {
    const client = new OAuth2Client(clientId())
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId(),
    })
    const payload = ticket.getPayload()
    if (!payload?.email) throw new Error('Google account has no email.')
    return {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      verified: Boolean(payload.email_verified),
      sub: payload.sub,
    }
  }

  if (accessToken) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) throw new Error('Google token is invalid.')
    const profile = await response.json()
    if (!profile.email) throw new Error('Google account has no email.')
    return {
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      verified: Boolean(profile.email_verified),
      sub: profile.sub,
    }
  }

  throw new Error('Missing Google credential.')
}
