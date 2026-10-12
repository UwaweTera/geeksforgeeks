export function parseJson(value, fallback) {
  if (value == null) return fallback
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function mapUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: '',
    role: row.role,
    bio: row.bio || '',
    country: row.country || '',
    university: row.university || '',
    education: row.education || '',
    skillLevel: row.skill_level || '',
    interests: parseJson(row.interests, []),
    github: row.github || '',
    linkedin: row.linkedin || '',
    website: row.website || '',
    twoFactor: Boolean(row.two_factor),
    emailVerified: Boolean(row.email_verified),
    phone: row.phone || '',
    whatsappOptIn: Boolean(row.whatsapp_opt_in),
    createdAt: row.created_at,
    xp: row.xp,
    streak: row.streak,
  }
}

export function mapCourse(row) {
  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    subtitle: row.subtitle,
    rating: Number(row.rating),
    level: row.level,
    interested: row.interested,
    tag: row.tag,
    live: Boolean(row.live),
    color: row.color,
    accent: row.accent,
    icon: row.icon,
    description: row.description,
    blurb: row.blurb || row.description,
    price: row.price || '',
    oldPrice: row.old_price || '',
    seats: row.seats || undefined,
    weeks: row.weeks || '',
    offerPercent: Number(row.offer_percent || 0),
    modules: parseJson(row.modules, []),
  }
}

export function mapArticle(row) {
  return {
    slug: row.slug,
    title: row.title,
    category: row.category,
    tags: parseJson(row.tags, []),
    difficulty: row.difficulty,
    minutes: row.minutes,
    published: row.published,
    updated: row.updated,
    excerpt: row.excerpt,
    body: parseJson(row.body, []),
  }
}

export function mapProblem(row) {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    topic: row.topic,
    companies: parseJson(row.companies, []),
    accuracy: row.accuracy,
    submissions: row.submissions,
    prompt: row.prompt,
    examples: parseJson(row.examples, []),
    constraints: parseJson(row.constraints_json, []),
    starter: parseJson(row.starter, {}),
    tests: parseJson(row.tests, []),
  }
}
