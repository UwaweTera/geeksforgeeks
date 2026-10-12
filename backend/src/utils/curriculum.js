import { parseJson } from './map.js'

const distractors = ['Photoshop filters', 'Spreadsheet macros', 'Keyboard shortcuts', 'Printer drivers']

function hash(text) {
  return [...String(text)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
}

function optionsFor(correct, salt) {
  const wrong = distractors.filter((item) => item !== correct).slice(0, 3)
  const answer = hash(String(correct) + salt) % 4
  const options = [...wrong]
  options.splice(answer, 0, correct)
  return { options: options.slice(0, 4), answer }
}

function questionsFor(mod, course) {
  const lessons = mod.lessons || []
  const first = lessons[0] || mod.title
  const mid = lessons[Math.floor(lessons.length / 2)] || first
  const last = lessons[lessons.length - 1] || first
  const q1 = optionsFor(first, 1)
  const q2 = optionsFor(mid, 2)
  const q3 = optionsFor(last, 3)
  return [
    {
      id: 'q1',
      prompt: `Which topic starts the ${mod.title} module in ${course.title}?`,
      options: q1.options,
      answer: q1.answer,
    },
    {
      id: 'q2',
      prompt: `Which of these belongs in ${mod.title}?`,
      options: q2.options,
      answer: q2.answer,
    },
    {
      id: 'q3',
      prompt: `After ${mod.title}, you should be able to apply:`,
      options: q3.options,
      answer: q3.answer,
    },
  ]
}

export function expandCourse(course) {
  const modules = parseJson(course.modules, [])
  const items = []
  for (const mod of modules) {
    const lessons = Array.isArray(mod.lessons) ? mod.lessons : []
    lessons.forEach((title, index) => {
      items.push({
        id: `${course.id}:${mod.id}:l${index + 1}`,
        moduleId: mod.id,
        moduleTitle: mod.title,
        title,
        type: 'read',
        minutes: 6,
        body: [
          `${title} is a core idea in ${mod.title} for ${course.title}.`,
          `In this lesson you will learn what ${title} is, when to use it, and how it shows up in projects and interviews.`,
          `Write a short example, then explain ${title} in your own words. When you can do that without notes, mark the lesson complete.`,
        ],
      })
    })
    items.push({
      id: `${course.id}:${mod.id}:quiz`,
      moduleId: mod.id,
      moduleTitle: mod.title,
      title: `${mod.title} check`,
      type: 'quiz',
      passScore: 70,
      questions: questionsFor(mod, course),
    })
  }
  return items
}

export function publicItem(item) {
  if (item.type !== 'quiz') return item
  return {
    ...item,
    questions: item.questions.map(({ answer, ...question }) => question),
  }
}

export function groupedModules(items) {
  const groups = []
  for (const item of items) {
    let group = groups.find((entry) => entry.id === item.moduleId)
    if (!group) {
      group = { id: item.moduleId, title: item.moduleTitle, lessons: [] }
      groups.push(group)
    }
    group.lessons.push(item)
  }
  return groups
}
