// Teste de conectividade com a API Gemini
// Execute: node test-gemini.mjs
const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY não definida no ambiente')
  process.exit(1)
}

console.log('🔑 Chave encontrada:', GEMINI_API_KEY.slice(0, 8) + '...')
console.log('📡 Testando conexão com generativelanguage.googleapis.com...')

const controller = new AbortController()
const timeoutId = setTimeout(() => {
  controller.abort()
  console.error('❌ TIMEOUT (10s) — Node.js não consegue alcançar a API do Gemini.')
  console.error('   Verifique: firewall, proxy, ou bloqueio de rede.')
}, 10_000)

try {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: 'Responda apenas: OK' }] }]
  })

  const start = Date.now()
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: controller.signal,
    }
  )
  clearTimeout(timeoutId)

  const elapsed = Date.now() - start
  const json = await res.json()

  if (!res.ok) {
    console.error(`❌ HTTP ${res.status}:`, JSON.stringify(json, null, 2))
    process.exit(1)
  }

  console.log(`✅ API respondeu em ${elapsed}ms`)
  console.log('Resposta:', json.candidates?.[0]?.content?.parts?.[0]?.text)
} catch (err) {
  clearTimeout(timeoutId)
  if (err.name === 'AbortError') {
    console.error('❌ TIMEOUT — Node.js não alcança googleapis.com')
  } else {
    console.error('❌ Erro de rede:', err.message)
  }
  process.exit(1)
}

