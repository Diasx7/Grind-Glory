import { useState } from 'react'
import { supabase } from './supabaseClient'

function Login() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  // manda o link magico pro email da pessoa
  async function entrar(e) {
    e.preventDefault()
    setCarregando(true)

    // emailRedirectTo faz o link do email voltar pra onde o app ta rodando
    // agora (localhost:5173 no pc, url da vercel no ar). sem isso ele usa o
    // Site URL do supabase, que vem como localhost:3000 e da pagina em branco
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })

    setCarregando(false)

    if (error) {
      alert('deu erro pra enviar o link: ' + error.message)
      return
    }

    setEnviado(true)
  }

  if (enviado) {
    return (
      <div className="login-caixa">
        <p>Manda um "link magico" pro seu email. Clica nele pra entrar.</p>
      </div>
    )
  }

  return (
    <form className="login-caixa" onSubmit={entrar}>
      <input
        type="email"
        placeholder="seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={carregando}>
        {carregando ? 'enviando...' : 'entrar com email'}
      </button>
    </form>
  )
}

export default Login
