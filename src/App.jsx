 import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from './supabaseClient'
import Login from './Login'
import TelaHoje from './TelaHoje'
import TelaHeroi from './TelaHeroi'
import './App.css'

function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [perfilPronto, setPerfilPronto] = useState(false)
  const [aba, setAba] = useState('hoje')

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
    } else {
      setPerfilPronto(false)
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
      const { error } = await supabase.from('usuario').insert({
        id: sessao.user.id,
        nome: sessao.user.email,
      })

      // se falhar aqui, salvar tarefa depois da erro de "foreign key",
      // entao deixo o motivo real aparecer no console
      if (error) {
        console.log('erro ao criar o usuario', error)
      }
    }

    setPerfilPronto(true)
  }

  // se ja ta logado, a tela de hoje toma conta do app inteiro
  if (supabaseConfigurado && !carregando && sessao) {
    // numa conta recem criada a linha do usuario ainda ta sendo inserida.
    // se a TelaHoje abrisse antes, ela leria perfil vazio e marcar tarefa
    // nao somaria moeda nenhuma.
    if (!perfilPronto) {
      return <div className="tela-carregando">preparando seu herói...</div>
    }

    return (
      <>
        {aba === 'hoje' ? (
          <TelaHoje usuario={sessao.user} />
        ) : (
          <TelaHeroi usuario={sessao.user} />
        )}

        {/* barrinha de navegacao fixa embaixo, que nem app de celular.
            trocar de aba desmonta a outra tela, entao ela sempre volta
            com os numeros recem buscados do banco. */}
        <nav className="abas">
          <button
            className={aba === 'hoje' ? 'aba aba-ativa' : 'aba'}
            onClick={() => setAba('hoje')}
          >
            <span className="aba-emoji">📋</span>
            Hoje
          </button>
          <button
            className={aba === 'heroi' ? 'aba aba-ativa' : 'aba'}
            onClick={() => setAba('heroi')}
          >
            <span className="aba-emoji">🛡️</span>
            Herói
          </button>
        </nav>
      </>
    )
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
      </div>

      <footer className="rodape">dia 3 · tela de hoje</footer>
    </div>
  )
}

export default App
