import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { avatares, categorias } from './jogo'
import { traduzirErro } from './Login'
import './Onboarding.css'

// leva a pessoa direto pro valor do app (o plano de amanha) ANTES de pedir
// qualquer coisa. so no fim pede conta, e so depois disso pede notificacao.
function Onboarding({ aoQuererLogin, aoTerminar }) {
  const [passo, setPasso] = useState('plano') // plano -> heroi -> conta -> notificacao

  // passo 1: as tarefas ficam no localStorage ate a conta existir de verdade
  const [tarefas, setTarefas] = useState(() => {
    const salvo = localStorage.getItem('onboardingTarefas')
    if (!salvo) return []
    try {
      return JSON.parse(salvo)
    } catch {
      return []
    }
  })
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')

  useEffect(() => {
    localStorage.setItem('onboardingTarefas', JSON.stringify(tarefas))
  }, [tarefas])

  function adicionarTarefa(e) {
    e.preventDefault()
    const tituloLimpo = titulo.trim()
    if (!tituloLimpo) return

    setTarefas([...tarefas, { titulo: tituloLimpo, categoria }])
    setTitulo('')
  }

  function removerTarefa(indice) {
    setTarefas(tarefas.filter((_, i) => i !== indice))
  }

  // passo 2: nome e aparencia do heroi - so estetico, nao muda atributo
  const [nome, setNome] = useState('')
  const [avatar, setAvatar] = useState(avatares[0])

  // passo 3: criar conta
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function criarConta(e) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setCarregando(true)

    // nome e avatar vao nos metadados - o App.jsx le daqui na hora de criar
    // a linha do usuario (mesmo esquema que ja existia so com o nome)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: { nome: nome.trim(), avatar: avatar },
      },
    })

    setCarregando(false)

    if (error) {
      setErro(traduzirErro(error.message))
      return
    }

    // com "Confirm email" ligado no Supabase, o signUp nao devolve sessao
    // ainda - o plano continua salvo no navegador esperando o link
    if (!data.session) {
      setAviso(
        'conta criada! confirma o link no seu email - o plano que você montou já está guardado, esperando você.',
      )
      return
    }

    // a sessao nova ja dispara o App.jsx criando o usuario e migrando as
    // tarefas sozinho (ver criarUsuarioSeNaoExiste) - o onboarding so segue
    // pro ultimo passo
    setPasso('notificacao')
  }

  // passo 4: pergunta a notificacao so agora, com o pra que explicito
  async function ativarLembrete() {
    if ('Notification' in window) {
      const permissao = await Notification.requestPermission()
      if (permissao === 'granted') {
        localStorage.setItem('lembreteAtivo', 'true')
      }
    }
    aoTerminar()
  }

  return (
    <div className="onboarding-tela">
      <div className="onboarding-brilho"></div>

      <div className="onboarding-conteudo">
        <span className="onboarding-marca">Grind & Glory</span>

        {passo === 'plano' && (
          <>
            <h1 className="onboarding-titulo">o que você quer fazer amanhã?</h1>
            <p className="onboarding-subtitulo">
              escreve 2 ou 3 coisas — é o começo do seu plano.
            </p>

            <form className="onboarding-form" onSubmit={adicionarTarefa}>
              <div className="linha-campo">
                <input
                  type="text"
                  placeholder="uma coisa que você vai fazer"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={80}
                  autoFocus
                />
                <button type="submit" className="botao-add" aria-label="adicionar">
                  +
                </button>
              </div>

              <div className="chips">
                {categorias.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={
                      categoria === c.id ? 'chip chip-ativo cor-' + c.id : 'chip'
                    }
                    onClick={() => setCategoria(c.id)}
                  >
                    {c.emoji} {c.nome}
                  </button>
                ))}
              </div>
            </form>

            {tarefas.length > 0 && (
              <ul className="onboarding-lista">
                {tarefas.map((t, i) => {
                  const cat = categorias.find((c) => c.id === t.categoria)
                  return (
                    <li key={i}>
                      <span>
                        {cat ? cat.emoji : ''} {t.titulo}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerTarefa(i)}
                        aria-label="remover"
                      >
                        ✕
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <button
              type="button"
              className="onboarding-botao-continuar"
              disabled={tarefas.length === 0}
              onClick={() => setPasso('heroi')}
            >
              continuar
            </button>
          </>
        )}

        {passo === 'heroi' && (
          <>
            <h1 className="onboarding-titulo">agora, seu herói</h1>
            <p className="onboarding-subtitulo">
              escolhe um nome e um jeitão pra ele — isso é só estética. quem
              faz ele crescer de verdade é você.
            </p>

            <input
              type="text"
              className="onboarding-input-nome"
              placeholder="nome do herói"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={30}
              autoFocus
            />

            <div className="onboarding-avatares">
              {avatares.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={
                    avatar === a
                      ? 'onboarding-avatar onboarding-avatar-ativo'
                      : 'onboarding-avatar'
                  }
                  onClick={() => setAvatar(a)}
                  aria-label={'escolher ' + a}
                >
                  {a}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="onboarding-botao-continuar"
              disabled={!nome.trim()}
              onClick={() => setPasso('conta')}
            >
              continuar
            </button>
          </>
        )}

        {passo === 'conta' && (
          <>
            <h1 className="onboarding-titulo">cria sua conta pra não perder esse plano</h1>
            <p className="onboarding-subtitulo">
              sem conta, o que você acabou de montar some se fechar o navegador.
            </p>

            <form className="onboarding-form-conta" onSubmit={criarConta}>
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

              {erro && <p className="erro-form">{erro}</p>}
              {aviso && <p className="onboarding-aviso">{aviso}</p>}

              <button
                type="submit"
                className="onboarding-botao-continuar"
                disabled={carregando}
              >
                {carregando ? 'criando...' : 'criar conta'}
              </button>
            </form>
          </>
        )}

        {passo === 'notificacao' && (
          <>
            <h1 className="onboarding-titulo">quer um lembrete às 21h?</h1>
            <p className="onboarding-subtitulo">
              pra não esquecer de planejar amanhã de novo. dá pra mudar isso
              depois, na tela do Herói.
            </p>

            <button
              type="button"
              className="onboarding-botao-continuar"
              onClick={ativarLembrete}
            >
              sim, me lembra
            </button>
            <button type="button" className="onboarding-botao-pular" onClick={aoTerminar}>
              agora não
            </button>
          </>
        )}

        {/* some so depois que a conta existe de verdade (passo notificacao) -
            ate la, sempre pode ser que a pessoa lembre que ja tem conta
            (inclusive se der erro de "email ja cadastrado" aqui embaixo) */}
        {passo !== 'notificacao' && (
          <button type="button" className="onboarding-ja-tenho-conta" onClick={aoQuererLogin}>
            já tenho conta, entrar
          </button>
        )}
      </div>
    </div>
  )
}

export default Onboarding
