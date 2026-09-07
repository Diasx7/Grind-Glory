 import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from './supabaseClient'
import { dataDeHoje } from './jogo'
import Login from './Login'
import TelaHoje from './TelaHoje'
import TelaHeroi from './TelaHeroi'
import TelaBatalha from './TelaBatalha'
import './App.css'

function App() {
  const [sessao, setSessao] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [perfilPronto, setPerfilPronto] = useState(false)
  const [erroPerfil, setErroPerfil] = useState(false)
  const [aba, setAba] = useState('hoje')
  const [diaAtual, setDiaAtual] = useState(dataDeHoje())

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

  // fica de olho se o dia virou com o app aberto (o classico: celular ficou
  // a noite toda com a aba aberta e a pessoa volta de manha). sem isso a
  // tela Hoje ficava presa no dia anterior ate recarregar a pagina.
  useEffect(() => {
    function verificarViradaDeDia() {
      const hoje = dataDeHoje()
      if (hoje !== diaAtual) {
        setDiaAtual(hoje)
      }
    }

    // visibilitychange pega o caso real (voltar pro app de manha).
    // o intervalo é so um reforço pra quem deixa o app aberto na tela o dia inteiro.
    document.addEventListener('visibilitychange', verificarViradaDeDia)
    const intervalo = setInterval(verificarViradaDeDia, 60000)

    return () => {
      document.removeEventListener('visibilitychange', verificarViradaDeDia)
      clearInterval(intervalo)
    }
  }, [diaAtual])

  useEffect(() => {
    if (sessao) {
      criarUsuarioSeNaoExiste()
    } else {
      setPerfilPronto(false)
    }
    // roda de novo quando o dia vira, pra zerar a energia sem precisar recarregar
  }, [sessao, diaAtual])

  // se é a primeira vez que essa pessoa loga, cria a linha dela na tabela usuario
  async function criarUsuarioSeNaoExiste() {
    setErroPerfil(false)

    const { data, error: erroBusca } = await supabase
      .from('usuario')
      .select('id, energia_data')
      .eq('id', sessao.user.id)
      .maybeSingle()

    if (erroBusca) {
      console.log('erro ao buscar o usuario', erroBusca)
      setErroPerfil(true)
      return
    }

    if (!data) {
      const { error } = await supabase.from('usuario').insert({
        id: sessao.user.id,
        nome: sessao.user.email,
        energia_data: dataDeHoje(),
      })

      // se falhar aqui, marcar tarefa nao ia fazer nada depois (sem perfil
      // pra somar moeda) e a pessoa ficaria sem entender o motivo
      if (error) {
        console.log('erro ao criar o usuario', error)
        setErroPerfil(true)
        return
      }
    } else {
      await zerarEnergiaSeVirouODia(data)
    }

    setPerfilPronto(true)
  }

  // energia é do dia e NAO acumula: senao daria pra guardar 40 tentativas
  // a semana inteira e zerar o jogo num sabado a tarde.
  // faço isso aqui porque o App roda uma vez so, antes das telas abrirem.
  async function zerarEnergiaSeVirouODia(perfil) {
    if (perfil.energia_data === dataDeHoje()) return

    const { error } = await supabase
      .from('usuario')
      .update({ energia: 0, energia_ganha: 0, energia_data: dataDeHoje() })
      .eq('id', sessao.user.id)

    if (error) {
      console.log('erro ao zerar a energia do dia', error)
    }
  }

  // se ja ta logado, a tela de hoje toma conta do app inteiro
  if (supabaseConfigurado && !carregando && sessao) {
    if (erroPerfil) {
      return (
        <div className="tela-carregando">
          <div className="carregando-erro">
            <p>não consegui preparar seu herói. confere sua internet.</p>
            <button className="botao-tentar-de-novo" onClick={criarUsuarioSeNaoExiste}>
              tentar de novo
            </button>
          </div>
        </div>
      )
    }

    // numa conta recem criada a linha do usuario ainda ta sendo inserida.
    // se a TelaHoje abrisse antes, ela leria perfil vazio e marcar tarefa
    // nao somaria moeda nenhuma.
    if (!perfilPronto) {
      return <div className="tela-carregando">preparando seu herói...</div>
    }

    return (
      <>
        {aba === 'hoje' && <TelaHoje usuario={sessao.user} diaAtual={diaAtual} />}
        {aba === 'heroi' && <TelaHeroi usuario={sessao.user} />}
        {aba === 'batalha' && <TelaBatalha usuario={sessao.user} />}

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
          <button
            className={aba === 'batalha' ? 'aba aba-ativa' : 'aba'}
            onClick={() => setAba('batalha')}
          >
            <span className="aba-emoji">⚔️</span>
            Batalha
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
    </div>
  )
}

export default App
