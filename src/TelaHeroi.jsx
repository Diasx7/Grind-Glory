import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { atributos, carinhaDoHeroi, convites, diasDesde, tetoDeEnergia } from './jogo'
import './TelaHeroi.css'

// o nivel sai do xp na hora de mostrar, entao nunca sai de sincronia.
// cada nivel custa 50 de xp a mais que o anterior.
function calcularNivel(xp) {
  let nivel = 1
  let sobra = xp
  let custo = 100

  while (sobra >= custo) {
    sobra -= custo
    nivel++
    custo += 50
  }

  return { nivel: nivel, dentro: sobra, custo: custo }
}

function TelaHeroi({ usuario }) {
  const [perfil, setPerfil] = useState(null)
  const [ultimaVez, setUltimaVez] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  // edicao do nome, pra quem criou conta antes de ter esse campo
  // (ou so quer trocar) e ficou com o email inteiro como nome
  const [editandoNome, setEditandoNome] = useState(false)
  const [nomeEditado, setNomeEditado] = useState('')
  const [salvandoNome, setSalvandoNome] = useState(false)
  const [erroNome, setErroNome] = useState('')

  // lembrete de planejar a noite - fica salvo no navegador (localStorage),
  // nao no banco, porque permissao de notificacao é por navegador/aparelho
  // mesmo, nao por conta. quem checa e dispara é o App.jsx.
  const [lembreteAtivo, setLembreteAtivo] = useState(
    () => localStorage.getItem('lembreteAtivo') === 'true',
  )
  const [lembreteHora, setLembreteHora] = useState(
    () => Number(localStorage.getItem('lembreteHora') ?? 21),
  )
  const [avisoLembrete, setAvisoLembrete] = useState('')

  useEffect(() => {
    buscarHeroi()
  }, [])

  async function buscarHeroi() {
    setCarregando(true)
    setErro(false)

    const { data: dadosPerfil, error: erroPerfil } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    if (erroPerfil) {
      console.log('erro ao buscar o perfil', erroPerfil)
      setErro(true)
      setCarregando(false)
      return
    }

    // o historico inteiro, so as duas colunas que interessam. ja vem do mais
    // novo pro mais velho, entao a primeira linha de cada atributo é a ultima
    // vez que ele subiu.
    const { data: historico, error } = await supabase
      .from('conclusao')
      .select('atributo, data')
      .eq('usuario_id', usuario.id)
      .order('data', { ascending: false })

    // o historico é só o texto "faz X dias" - se falhar, a tela ainda
    // funciona sem esse recado, entao nao precisa travar tudo por isso
    if (error) {
      console.log('erro ao buscar o historico', error)
    }

    const ultima = {}
    if (historico) {
      historico.forEach((c) => {
        if (c.atributo && !ultima[c.atributo]) {
          ultima[c.atributo] = c.data
        }
      })
    }

    setPerfil(dadosPerfil)
    setUltimaVez(ultima)
    setCarregando(false)
  }

  if (carregando) {
    return (
      <div className="tela-heroi">
        <p className="heroi-aviso">carregando seu herói...</p>
      </div>
    )
  }

  if (erro || !perfil) {
    return (
      <div className="tela-heroi">
        <div className="heroi-erro">
          <p className="heroi-aviso">não consegui carregar seu herói. confere sua internet.</p>
          <button className="botao-tentar-de-novo" onClick={buscarHeroi}>
            tentar de novo
          </button>
        </div>
      </div>
    )
  }

  const chaves = Object.keys(atributos)
  const valores = chaves.map((c) => perfil[c])
  const maior = Math.max(...valores)
  const menor = Math.min(...valores)
  const total = valores.reduce((a, b) => a + b, 0)

  const nivel = calcularNivel(perfil.xp)
  const nome = perfil.nome || usuario.email.split('@')[0]

  function comecarEditarNome() {
    setErroNome('')
    setNomeEditado(perfil.nome || '')
    setEditandoNome(true)
  }

  async function salvarNome(e) {
    e.preventDefault()

    const nomeLimpo = nomeEditado.trim()
    if (!nomeLimpo) return

    setErroNome('')
    setSalvandoNome(true)

    const { error } = await supabase
      .from('usuario')
      .update({ nome: nomeLimpo })
      .eq('id', usuario.id)

    setSalvandoNome(false)

    if (error) {
      console.log('erro ao salvar o nome', error)
      setErroNome('não consegui salvar, tenta de novo')
      return
    }

    setPerfil({ ...perfil, nome: nomeLimpo })
    setEditandoNome(false)
  }

  // desligar nunca pede nada. ligar pede a permissao do navegador na hora -
  // só quando a pessoa pede, nunca sozinho quando a tela abre.
  async function alternarLembrete() {
    setAvisoLembrete('')

    if (lembreteAtivo) {
      localStorage.setItem('lembreteAtivo', 'false')
      setLembreteAtivo(false)
      return
    }

    if (!('Notification' in window)) {
      setAvisoLembrete('seu navegador não suporta notificação.')
      return
    }

    const permissao = await Notification.requestPermission()

    if (permissao !== 'granted') {
      setAvisoLembrete(
        'sem permissão, não consigo avisar. dá pra ativar depois nas configurações de notificação do navegador.',
      )
      return
    }

    localStorage.setItem('lembreteAtivo', 'true')
    setLembreteAtivo(true)
  }

  function mudarHoraLembrete(novaHora) {
    localStorage.setItem('lembreteHora', String(novaHora))
    setLembreteHora(novaHora)
  }

  // a frase que nomeia o desequilibrio. constata, nao cobra.
  function fraseDoEspelho() {
    // se o mais esquecido ja tem 60% do mais forte, ta bem distribuido
    if (menor / maior >= 0.6) {
      return 'seus três lados estão andando juntos ✨'
    }

    const forte = atributos[chaves[valores.indexOf(maior)]].nome
    const fraco = atributos[chaves[valores.indexOf(menor)]].nome
    return (
      'seu herói anda bem mais de ' +
      forte +
      ' do que de ' +
      fraco +
      '. nada quebrado, só desigual.'
    )
  }

  // o recado embaixo de cada barra. "chamando" é quando ta parado ha dias
  // e vale um empurraozinho.
  function recado(chave) {
    const data = ultimaVez[chave]

    if (!data) {
      return { texto: 'ainda não teve nada por aqui — ' + convites[chave], chamando: false }
    }

    const dias = diasDesde(data)

    if (dias <= 0) return { texto: 'você cuidou disso hoje ✨', chamando: false }
    if (dias === 1) return { texto: 'você cuidou disso ontem', chamando: false }
    if (dias === 2) return { texto: 'faz 2 dias', chamando: false }

    return {
      texto:
        'faz ' +
        dias +
        ' dias sem nada de ' +
        atributos[chave].nome +
        ' ' +
        atributos[chave].emoji +
        ' — ' +
        convites[chave],
      chamando: true,
    }
  }

  return (
    <div className="tela-heroi">
      <div className="brilho-heroi"></div>

      <div className="conteudo-heroi">
        <div className="cartao-heroi">
          <div className="heroi-carinha">{carinhaDoHeroi(perfil)}</div>

          {editandoNome ? (
            <form className="form-nome" onSubmit={salvarNome}>
              <input
                type="text"
                value={nomeEditado}
                onChange={(e) => setNomeEditado(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <button type="submit" disabled={salvandoNome}>
                {salvandoNome ? '...' : 'salvar'}
              </button>
              <button
                type="button"
                className="botao-cancelar-nome"
                onClick={() => setEditandoNome(false)}
              >
                cancelar
              </button>
              {erroNome && <p className="erro-nome">{erroNome}</p>}
            </form>
          ) : (
            <button
              type="button"
              className="botao-heroi-nome"
              onClick={comecarEditarNome}
            >
              <span className="heroi-nome">{nome}</span>
              <span className="lapis-nome">✏️</span>
            </button>
          )}

          <p className="heroi-nivel">Nível {nivel.nivel}</p>

          <div className="barra-nivel">
            <div
              className="barra-nivel-cheia"
              style={{ width: (nivel.dentro / nivel.custo) * 100 + '%' }}
            ></div>
          </div>
          <p className="heroi-xp">
            {nivel.dentro} / {nivel.custo} XP pro nível {nivel.nivel + 1}
          </p>

          <div className="heroi-bolsos">
            <span>🪙 {perfil.moedas} moedas</span>
            <span>⭐ {perfil.xp} XP</span>
            <span>
              🔋 {perfil.energia}/{tetoDeEnergia}
            </span>
          </div>
        </div>

        <h2 className="titulo-espelho">seu espelho</h2>

        {total === 0 ? (
          <div className="heroi-vazio">
            <p className="heroi-vazio-titulo">
              seu herói ainda é uma folha em branco 🌱
            </p>
            <p className="heroi-vazio-texto">
              marca a primeira tarefa lá na aba Hoje e ele começa a tomar forma.
              o que você faz na vida real é o que ele vira aqui.
            </p>
          </div>
        ) : (
          <p className="frase-espelho">{fraseDoEspelho()}</p>
        )}

        <div className="lista-atributos">
          {chaves.map((chave) => {
            const valor = perfil[chave]
            // a barra é relativa ao atributo mais alto: assim o que ta pra tras
            // fica curto de verdade e da pra ver o desequilibrio de longe
            const largura = maior === 0 ? 0 : (valor / maior) * 100
            const r = recado(chave)

            return (
              <div key={chave} className="atributo-bloco">
                <div className="atributo-topo">
                  <span className="atributo-nome">
                    {atributos[chave].emoji} {atributos[chave].nome}
                  </span>
                  <span className="atributo-valor">{valor}</span>
                </div>

                <div className="barra-fundo">
                  <div
                    className={'barra-cheia barra-' + chave}
                    style={{ width: largura + '%' }}
                  ></div>
                </div>

                <p
                  className={
                    r.chamando ? 'atributo-recado recado-chamando' : 'atributo-recado'
                  }
                >
                  {r.texto}
                </p>
              </div>
            )
          })}
        </div>

        <section className="bloco-lembrete">
          <h2 className="titulo-espelho">lembretes</h2>

          <div className="lembrete-linha">
            <span>🔔 avisar de noite pra planejar amanhã</span>
            <button
              type="button"
              className={lembreteAtivo ? 'interruptor interruptor-ligado' : 'interruptor'}
              onClick={alternarLembrete}
              aria-pressed={lembreteAtivo}
            >
              {lembreteAtivo ? 'ligado' : 'desligado'}
            </button>
          </div>

          {lembreteAtivo && (
            <div className="lembrete-linha">
              <span>horário</span>
              <select
                value={lembreteHora}
                onChange={(e) => mudarHoraLembrete(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00
                  </option>
                ))}
              </select>
            </div>
          )}

          {avisoLembrete && <p className="erro-nome">{avisoLembrete}</p>}

          <p className="lembrete-nota">
            é só um convite pra planejar - nunca uma cobrança do que ficou sem
            fazer. só funciona com o app aberto em alguma aba (mesmo em
            segundo plano); com o navegador todo fechado, o aviso não chega.
          </p>
        </section>
      </div>
    </div>
  )
}

export default TelaHeroi
