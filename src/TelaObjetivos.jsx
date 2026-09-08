import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { categorias } from './jogo'
import './TelaObjetivos.css'

// so um aviso gentil quando passa disso - nao trava a criacao de jeito
// nenhum, é so pra nao incentivar empilhar objetivo demais
const limiteRecomendado = 3

function TelaObjetivos({ usuario }) {
  const [objetivos, setObjetivos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [mostrarConcluidos, setMostrarConcluidos] = useState(false)
  const [mostrarForm, setMostrarForm] = useState(false)

  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')
  const [tipo, setTipo] = useState('etapas')
  const [alvo, setAlvo] = useState('')
  const [unidade, setUnidade] = useState('')
  const [erroForm, setErroForm] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    buscarObjetivos()
  }, [])

  async function buscarObjetivos() {
    setErro(false)

    const { data, error } = await supabase
      .from('objetivo')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: true })

    if (error) {
      console.log('erro ao buscar objetivos', error)
      setErro(true)
      setCarregando(false)
      return
    }

    setObjetivos(data)
    setCarregando(false)
  }

  async function criarObjetivo(e) {
    e.preventDefault()
    setErroForm('')

    const tituloLimpo = titulo.trim()
    if (!tituloLimpo) return

    const alvoNumero = Number(alvo)
    if (!alvoNumero || alvoNumero <= 0) {
      setErroForm('coloca um alvo maior que zero')
      return
    }

    setSalvando(true)

    const { data, error } = await supabase
      .from('objetivo')
      .insert({
        usuario_id: usuario.id,
        titulo: tituloLimpo,
        categoria: categoria,
        tipo: tipo,
        alvo: alvoNumero,
        unidade: unidade.trim() || null,
      })
      .select()
      .single()

    setSalvando(false)

    if (error) {
      console.log('erro ao criar objetivo', error)
      setErroForm('não consegui salvar, tenta de novo')
      return
    }

    setObjetivos((atual) => [...atual, data])
    setTitulo('')
    setAlvo('')
    setUnidade('')
    setMostrarForm(false)
  }

  // arquivar, nunca apagar - o que ja avançou fica guardado, so sai do
  // caminho. sem confirmacao dupla nem "tem certeza mesmo?", é so um toque.
  async function arquivar(objetivo) {
    const confirmou = window.confirm(
      'arquivar "' +
        objetivo.titulo +
        '"?\n\nsai do caminho sem culpa - o que já avançou continua guardado.',
    )
    if (!confirmou) return

    setObjetivos((atual) => atual.filter((o) => o.id !== objetivo.id))

    const { error } = await supabase
      .from('objetivo')
      .update({ status: 'arquivado' })
      .eq('id', objetivo.id)

    if (error) {
      console.log('erro ao arquivar objetivo', error)
      buscarObjetivos()
    }
  }

  if (carregando) {
    return (
      <div className="tela-objetivos">
        <p className="objetivos-aviso">carregando seus objetivos...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="tela-objetivos">
        <div className="objetivos-erro">
          <p className="objetivos-aviso">não consegui carregar. confere sua internet.</p>
          <button className="botao-tentar-de-novo" onClick={buscarObjetivos}>
            tentar de novo
          </button>
        </div>
      </div>
    )
  }

  const ativos = objetivos.filter((o) => o.status === 'ativo')
  const concluidos = objetivos.filter((o) => o.status === 'concluido')

  return (
    <div className="tela-objetivos">
      <div className="brilho-objetivos"></div>

      <div className="conteudo-objetivos">
        <header className="topo-objetivos">
          <h1 className="titulo-objetivos">Objetivos</h1>
          <p className="subtitulo-objetivos">as coisas grandes, em passos pequenos</p>
        </header>

        {ativos.length === 0 && (
          <div className="vazio">
            <div className="vazio-emoji">🎯</div>
            <p className="vazio-titulo">nenhum objetivo ainda</p>
            <p className="vazio-texto">
              aquela coisa grande demais pra motivar sozinha - "terminar o TCC",
              "juntar pra uma viagem" - vira uma barra de progresso aqui. as
              tarefas do dia a dia é que empurram ela pra frente.
            </p>
          </div>
        )}

        <div className="lista-objetivos">
          {ativos.map((o) => (
            <CartaoObjetivo key={o.id} objetivo={o} onArquivar={() => arquivar(o)} />
          ))}
        </div>

        {ativos.length >= limiteRecomendado && !mostrarForm && (
          <p className="aviso-limite">
            você já tem {ativos.length} objetivos ativos — poucos de cada vez
            funciona melhor que muitos ao mesmo tempo.
          </p>
        )}

        {!mostrarForm && (
          <button
            type="button"
            className="botao-novo-objetivo"
            onClick={() => setMostrarForm(true)}
          >
            + novo objetivo
          </button>
        )}

        {mostrarForm && (
          <form className="form-objetivo" onSubmit={criarObjetivo}>
            <input
              type="text"
              placeholder="qual é o objetivo?"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={80}
              autoFocus
            />

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

            {/* etapas conta em unidades inteiras (capitulos, aulas...),
                valor é pra alvo numerico tipo dinheiro (quanto falta) */}
            <div className="seletor-tipo">
              <button
                type="button"
                className={tipo === 'etapas' ? 'chip chip-dia-ativo' : 'chip'}
                onClick={() => setTipo('etapas')}
              >
                por etapas
              </button>
              <button
                type="button"
                className={tipo === 'valor' ? 'chip chip-dia-ativo' : 'chip'}
                onClick={() => setTipo('valor')}
              >
                por valor
              </button>
            </div>

            <div className="linha-alvo">
              <input
                type="number"
                placeholder={tipo === 'etapas' ? 'quantas etapas? (ex: 10)' : 'alvo (ex: 5000)'}
                value={alvo}
                onChange={(e) => setAlvo(e.target.value)}
                min="1"
                step="any"
              />
              <input
                type="text"
                placeholder={tipo === 'etapas' ? 'capítulos' : 'R$'}
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                maxLength={12}
                className="input-unidade"
              />
            </div>

            {erroForm && <p className="erro-form">{erroForm}</p>}

            <div className="botoes-editar">
              <button type="submit" disabled={salvando}>
                {salvando ? 'salvando...' : 'criar objetivo'}
              </button>
              <button
                type="button"
                className="botao-cancelar-nome"
                onClick={() => setMostrarForm(false)}
              >
                cancelar
              </button>
            </div>
          </form>
        )}

        {concluidos.length > 0 && (
          <section className="painel-concluidos">
            <button
              type="button"
              className="concluidos-toggle"
              onClick={() => setMostrarConcluidos(!mostrarConcluidos)}
            >
              🏆 concluídos ({concluidos.length})
            </button>

            {mostrarConcluidos && (
              <ul className="lista-concluidos">
                {concluidos.map((o) => (
                  <li key={o.id}>
                    <span>{o.titulo}</span>
                    <span className="concluido-data">
                      {o.concluido_em
                        ? new Date(o.concluido_em).toLocaleDateString('pt-BR')
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

// cartao de um objetivo ativo, com a barra de progresso
function CartaoObjetivo({ objetivo, onArquivar }) {
  const cat = categorias.find((c) => c.id === objetivo.categoria)
  // Number() por seguranca: numeric do Postgres as vezes volta como texto
  const progresso = Number(objetivo.progresso)
  const alvo = Number(objetivo.alvo)
  const porcentagem = Math.min(100, (progresso / alvo) * 100)
  const falta = Math.max(0, alvo - progresso)
  const unidade = objetivo.unidade || (objetivo.tipo === 'etapas' ? 'etapas' : '')

  return (
    <div className="cartao-objetivo">
      <div className="objetivo-topo">
        <span className="objetivo-titulo">
          {cat ? cat.emoji : '🎯'} {objetivo.titulo}
        </span>
        <button
          type="button"
          className="botao-arquivar"
          onClick={onArquivar}
          aria-label="arquivar objetivo"
        >
          ✕
        </button>
      </div>

      <div className="objetivo-barra-fundo">
        <div
          className={'objetivo-barra-cheia barra-cheia-' + (cat ? cat.atributo : 'generico')}
          style={{ width: porcentagem + '%' }}
        ></div>
      </div>

      <p className="objetivo-numeros">
        {objetivo.tipo === 'etapas' ? (
          <>
            {progresso} de {alvo} {unidade}
          </>
        ) : (
          <>
            {progresso} / {alvo} {unidade} — falta {falta} {unidade}
          </>
        )}
      </p>
    </div>
  )
}

export default TelaObjetivos
