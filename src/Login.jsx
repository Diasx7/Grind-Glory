import { useState } from 'react'
import { supabase } from './supabaseClient'

// o supabase responde em ingles, entao traduzo os erros mais comuns
function traduzirErro(mensagem) {
  if (mensagem.includes('Invalid login credentials')) {
    return 'email ou senha errados. se ainda não tem conta, clica em "criar conta".'
  }
  if (mensagem.includes('User already registered')) {
    return 'esse email já tem conta. tenta entrar em vez de criar.'
  }
  if (mensagem.includes('Password should be at least')) {
    return 'a senha precisa ter pelo menos 6 caracteres.'
  }
  if (mensagem.includes('Email not confirmed')) {
    return 'esse email ainda não foi confirmado.'
  }
  if (mensagem.includes('Failed to fetch')) {
    return 'não consegui falar com o servidor. confere sua internet e tenta de novo.'
  }
  return mensagem
}

function Login() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setCarregando(true)

    // deu certo? o onAuthStateChange la no App percebe a sessao nova
    // e troca a tela sozinho, nao preciso fazer nada aqui
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: senha,
    })

    setCarregando(false)

    if (error) {
      setErro(traduzirErro(error.message))
    }
  }

  async function criarConta() {
    setErro('')
    setAviso('')

    // esse botao é type="button", entao o required dos campos nao vale nele
    if (!nome || !email || !senha) {
      setErro('preenche o nome, o email e a senha primeiro.')
      return
    }

    setCarregando(true)

    // o nome vai nos metadados do auth - o App.jsx le daqui pra criar a
    // linha do usuario com o nome certo, em vez do email
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: { nome: nome.trim() },
      },
    })

    setCarregando(false)

    if (error) {
      setErro(traduzirErro(error.message))
      return
    }

    // com o "Confirm email" desligado o signUp ja devolve a sessao e o app
    // entra direto. se vier sem sessao, é porque a confirmacao ta ligada.
    if (!data.session) {
      setAviso('conta criada. confirma o link no seu email pra poder entrar.')
    }
  }

  return (
    <form className="login-caixa" onSubmit={entrar}>
      <input
        type="text"
        placeholder="seu nome (só pra criar conta)"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={30}
      />

      <input
        type="email"
        placeholder="seu email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="sua senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
      />

      {erro && <p className="login-erro">{erro}</p>}
      {aviso && <p className="login-aviso">{aviso}</p>}

      <div className="login-botoes">
        <button type="submit" disabled={carregando}>
          {carregando ? 'aguenta...' : 'entrar'}
        </button>
        <button
          type="button"
          className="botao-secundario"
          onClick={criarConta}
          disabled={carregando}
        >
          criar conta
        </button>
      </div>
    </form>
  )
}

export default Login
