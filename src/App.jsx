 import { useState, useEffect } from 'react'
import { supabase, supabaseConfigurado } from './supabaseClient'
import { dataDeHoje, somarDias } from './jogo'
import Login from './Login'
import TelaHoje from './TelaHoje'
import TelaSemana from './TelaSemana'
import TelaObjetivos from './TelaObjetivos'
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

  // lembrete de planejar a noite. so funciona com o app aberto em alguma
  // aba (a config e o "ja avisei hoje" ficam no localStorage, ver TelaHeroi.jsx
  // pra onde liga/desliga isso). fica aqui no App e nao na TelaHoje porque
  // precisa continuar rodando mesmo se a pessoa tiver em outra aba.
  useEffect(() => {
    if (!sessao) return

    async function verificarLembrete() {
      if (localStorage.getItem('lembreteAtivo') !== 'true') return
      if (!('Notification' in window) || Notification.permission !== 'granted') return

      const hora = Number(localStorage.getItem('lembreteHora') ?? 21)
      if (new Date().getHours() < hora) return

      const hoje = dataDeHoje()
      if (localStorage.getItem('lembreteUltimoAviso') === hoje) return

      // se amanha ja tem alguma tarefa planejada, nao precisa lembrar - é
      // convite pra planejar, nao insistencia com quem ja fez
      const amanha = somarDias(hoje, 1)
      const { data, error } = await supabase
        .from('tarefa')
        .select('id')
        .eq('usuario_id', sessao.user.id)
        .eq('arquivada', false)
        .eq('recorrente', false)
        .eq('data_ref', amanha)

      if (error) {
        console.log('erro ao checar tarefas de amanha pro lembrete', error)
        return
      }

      // marca como avisado hoje de qualquer forma - se ja tem tarefa, o dia
      // "ta resolvido" e nao precisa tentar de novo nos proximos minutos
      localStorage.setItem('lembreteUltimoAviso', hoje)

      if (data.length > 0) return

      const opcoes = {
        body: 'já pensou no que vai fazer amanhã? dois minutos hoje e o dia já começa andando 🌙',
        icon: '/icone-192.png',
        tag: 'planejar-amanha',
      }

      const registro = await navigator.serviceWorker?.getRegistration()
      if (registro) {
        registro.showNotification('Grind & Glory', opcoes)
      } else {
        new Notification('Grind & Glory', opcoes)
      }
    }

    verificarLembrete()
    const intervalo = setInterval(verificarLembrete, 60000)
    document.addEventListener('visibilitychange', verificarLembrete)

    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', verificarLembrete)
    }
  }, [sessao])

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
      // o nome digitado no cadastro vem nos metadados do auth (ver Login.jsx).
      // se nao tiver por algum motivo, cai no pedaço do email so pra nao
      // ficar em branco
      const nomeDoCadastro =
        sessao.user.user_metadata?.nome || sessao.user.email.split('@')[0]

      const { error } = await supabase.from('usuario').insert({
        id: sessao.user.id,
        nome: nomeDoCadastro,
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
        {aba === 'semana' && <TelaSemana usuario={sessao.user} diaAtual={diaAtual} />}
        {aba === 'objetivos' && <TelaObjetivos usuario={sessao.user} />}
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
            className={aba === 'semana' ? 'aba aba-ativa' : 'aba'}
            onClick={() => setAba('semana')}
          >
            <span className="aba-emoji">🗓️</span>
            Semana
          </button>
          <button
            className={aba === 'objetivos' ? 'aba aba-ativa' : 'aba'}
            onClick={() => setAba('objetivos')}
          >
            <span className="aba-emoji">🎯</span>
            Objetivos
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
