import 'dotenv/config'

const phone = '250787879364'
const key = process.env.CALLMEBOT_APIKEY
const text = 'GeekPath test: new course you can study. Open http://localhost:8080/courses'
const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`

console.log('Using key length:', String(key || '').length)
const response = await fetch(url)
const body = await response.text()
console.log('HTTP status:', response.status)
console.log('Body:', body)
process.exit(0)
