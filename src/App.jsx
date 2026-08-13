import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from './supabaseClient'
import Login from './Login'
import TelaTeste from './TelaTeste'
import './App.css'

function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    // se o .env ainda nao foi preenchido, nem tenta falar com o supabase
    if (!supabaseConfigurado) {
      setCarregando(false)
      return
    }

    // ve se ja tem alguem logado quando o app abre
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session)
      setCarregando(false)
    })

    // fica escutando login/logout acontecer
    const { data: escuta } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
    })

    return () => escuta.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (sessao) {
      criarUsuarioSeNaoExiste()
    }
  }, [sessao])

  // se é a primeira vez que essa pessoa loga, cria a linha dela na tabela usuario
  async function criarUsuarioSeNaoExiste() {
    const { data } = await supabase
      .from('usuario')
      .select('id')
      .eq('id', sessao.user.id)
      .maybeSingle()

    if (!data) {
      await supabase.from('usuario').insert({
        id: sessao.user.id,
        nome: sessao.user.email,
      })
    }
  }

  return (
    <div className="tela-inicial">
      <div className="brilho"></div>

      <main className="conteudo">
        <span className="selo">RPG DA VIDA REAL</span>

        <h1 className="titulo">
          Grind <span className="e-comercial">&</span> Glory
        </h1>

        <p className="subtitulo">
          seu progresso na vida real vira poder no jogo
        </p>

        <div className="barra-xp">
          <div className="barra-xp-preenchida"></div>
        </div>
      </main>

      <div className="area-login">
        {!supabaseConfigurado && (
          <p>
            falta configurar o arquivo <code>.env</code> com as chaves do
            Supabase (olha o README).
          </p>
        )}
        {supabaseConfigurado && carregando && <p>carregando...</p>}
        {supabaseConfigurado && !carregando && !sessao && <Login />}
        {supabaseConfigurado && !carregando && sessao && (
          <TelaTeste usuario={sessao.user} />
        )}
      </div>

      <footer className="rodape">dia 2 · login e banco de dados</footer>
    </div>
  )
}

export default App
