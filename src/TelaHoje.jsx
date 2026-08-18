import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { atributos, dataDeHoje } from './jogo'
import './TelaHoje.css'

// as categorias do jogo. a dificuldade de cada uma tambem vive no trigger
// aplicar_dificuldade() la no banco - mexeu aqui, mexe la tambem.
const categorias = [
  { id: 'estudo', nome: 'Estudo', emoji: '📘', atributo: 'inteligencia' },
  { id: 'leitura', nome: 'Leitura', emoji: '📖', atributo: 'inteligencia' },
  { id: 'exercicio', nome: 'Exercício', emoji: '💪', atributo: 'forca' },
  { id: 'saude', nome: 'Saúde', emoji: '🌿', atributo: 'forca' },
  { id: 'trabalho', nome: 'Trabalho', emoji: '💼', atributo: 'agilidade' },
  { id: 'organizacao', nome: 'Organização', emoji: '🧹', atributo: 'agilidade' },
]

// o que cada dificuldade rende. a curva é quase reta de proposito: tarefa
// pequena TEM que valer a pena, é a ideia do app inteiro.
const recompensas = {
  1: { moedas: 5, xp: 10, pontos: 1 },
  2: { moedas: 10, xp: 22, pontos: 2 },
  3: { moedas: 18, xp: 40, pontos: 3 },
}

// da 4a tarefa da mesma categoria no mesmo dia em diante, o ganho cai pela
// metade. nao bloqueia nada, so tira a graça de picar uma tarefa em dez.
const limiteSemDesconto = 3

function TelaHoje({ usuario }) {
  const [tarefas, setTarefas] = useState([])
  const [conclusoes, setConclusoes] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')
  const [carregando, setCarregando] = useState(true)
  const [ganhoNaTela, setGanhoNaTela] = useState(null)

  const tempoDoGanho = useRef(null)

  useEffect(() => {
    buscarTudo()
  }, [])

  async function buscarTudo() {
    const hoje = dataDeHoje()

    // as tarefas marcadas pra hoje (data_ref), nao as criadas hoje
    const { data: listaTarefas, error: erroTarefas } = await supabase
      .from('tarefa')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('data_ref', hoje)
      .order('criada_em', { ascending: true })

    // e as conclusoes de hoje, que é o que diz se a tarefa ta feita
    const { data: listaConclusoes, error: erroConclusoes } = await supabase
      .from('conclusao')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('data', hoje)

    // maybeSingle porque no primeiro login o App ainda pode estar criando
    // essa linha; se vier null a tela so nao deixa concluir por um segundo
    const { data: dadosPerfil } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    if (erroTarefas || erroConclusoes) {
      console.log('erro ao buscar', erroTarefas || erroConclusoes)
      setCarregando(false)
      return
    }

    setTarefas(listaTarefas)
    setConclusoes(listaConclusoes)
    setPerfil(dadosPerfil)
    setCarregando(false)
  }

  // tarefa feita agora é "existe conclusao dela hoje", nao é mais um booleano
  function estaFeita(tarefa) {
    return conclusoes.some((c) => c.tarefa_id === tarefa.id)
  }

  // quantas tarefas dessa categoria ja foram concluidas hoje
  function quantasFeitasNaCategoria(idCategoria) {
    return conclusoes.filter((c) => {
      const t = tarefas.find((t) => t.id === c.tarefa_id)
      return t && t.categoria === idCategoria
    }).length
  }

  function calcularGanho(tarefa) {
    const base = recompensas[tarefa.dificuldade] || recompensas[1]
    const cat = categorias.find((c) => c.id === tarefa.categoria)
    const atributo = cat ? cat.atributo : null

    const cortarPelaMetade =
      quantasFeitasNaCategoria(tarefa.categoria) >= limiteSemDesconto

    if (!cortarPelaMetade) {
      return {
        moedas: base.moedas,
        xp: base.xp,
        atributo: atributo,
        pontos: base.pontos,
        reduzido: false,
      }
    }

    // arredonda pra cima pra nunca dar zero - a ideia é desincentivar, nao punir
    return {
      moedas: Math.round(base.moedas / 2),
      xp: Math.round(base.xp / 2),
      atributo: atributo,
      pontos: Math.round(base.pontos / 2),
      reduzido: true,
    }
  }

  // soma (ou devolve, se vier negativo) moeda, xp e atributo no perfil
  async function mexerNoPerfil(moedas, xp, atributo, pontos) {
    if (!perfil) return

    const novo = {
      moedas: Math.max(0, perfil.moedas + moedas),
      xp: Math.max(0, perfil.xp + xp),
    }

    // cada atributo é uma coluna diferente, entao monto a chave na hora
    if (atributo) {
      novo[atributo] = Math.max(0, perfil[atributo] + pontos)
    }

    setPerfil({ ...perfil, ...novo })

    const { error } = await supabase
      .from('usuario')
      .update(novo)
      .eq('id', usuario.id)

    if (error) {
      console.log('erro ao salvar o perfil', error)
      buscarTudo()
    }
  }

  function mostrarGanho(ganho, nomeCategoria) {
    clearTimeout(tempoDoGanho.current)
    setGanhoNaTela({ ...ganho, nomeCategoria })
    tempoDoGanho.current = setTimeout(() => setGanhoNaTela(null), 3500)
  }

  async function criarTarefa(e) {
    e.preventDefault()

    const textoLimpo = titulo.trim()
    if (!textoLimpo) return

    // nao mando dificuldade: o trigger do banco calcula ela pela categoria
    const { data, error } = await supabase
      .from('tarefa')
      .insert({
        usuario_id: usuario.id,
        titulo: textoLimpo,
        categoria: categoria,
        data_ref: dataDeHoje(),
        recorrente: false,
      })
      .select()
      .single()

    if (error) {
      console.log('erro ao criar tarefa', error)
      alert('nao consegui salvar essa tarefa, tenta de novo')
      return
    }

    setTitulo('')
    setTarefas([...tarefas, data])
  }

  function marcarTarefa(tarefa) {
    if (estaFeita(tarefa)) {
      desconcluir(tarefa)
    } else {
      concluir(tarefa)
    }
  }

  async function concluir(tarefa) {
    // sem perfil carregado eu nao teria onde somar a moeda, entao nem começo
    if (!perfil) return

    const ganho = calcularGanho(tarefa)

    // o quanto rendeu fica gravado na propria conclusao. é isso que deixa
    // devolver o valor exato depois, mesmo se a regra da metade tiver batido.
    const { data, error } = await supabase
      .from('conclusao')
      .insert({
        tarefa_id: tarefa.id,
        usuario_id: usuario.id,
        data: dataDeHoje(),
        moedas: ganho.moedas,
        xp: ganho.xp,
        atributo: ganho.atributo,
        pontos_atributo: ganho.pontos,
      })
      .select()
      .single()

    if (error) {
      console.log('erro ao concluir', error)
      return
    }

    setConclusoes([...conclusoes, data])
    mexerNoPerfil(ganho.moedas, ganho.xp, ganho.atributo, ganho.pontos)

    const cat = categorias.find((c) => c.id === tarefa.categoria)
    mostrarGanho(ganho, cat ? cat.nome : '')
  }

  async function desconcluir(tarefa) {
    const conclusao = conclusoes.find((c) => c.tarefa_id === tarefa.id)
    if (!conclusao) return

    const { error } = await supabase
      .from('conclusao')
      .delete()
      .eq('id', conclusao.id)

    if (error) {
      console.log('erro ao desconcluir', error)
      return
    }

    setConclusoes(conclusoes.filter((c) => c.id !== conclusao.id))

    // devolve exatamente o que essa conclusao tinha dado
    mexerNoPerfil(
      -conclusao.moedas,
      -conclusao.xp,
      conclusao.atributo,
      -conclusao.pontos_atributo,
    )
  }

  async function apagarTarefa(tarefa) {
    // se ela ja tava feita, devolve o ganho antes de sumir. senao dava pra
    // farmar assim: cria, marca, apaga, cria de novo, marca de novo...
    const conclusao = conclusoes.find((c) => c.tarefa_id === tarefa.id)
    if (conclusao) {
      mexerNoPerfil(
        -conclusao.moedas,
        -conclusao.xp,
        conclusao.atributo,
        -conclusao.pontos_atributo,
      )
    }

    setTarefas(tarefas.filter((t) => t.id !== tarefa.id))
    setConclusoes(conclusoes.filter((c) => c.tarefa_id !== tarefa.id))

    // o banco apaga a conclusao junto por causa do "on delete cascade"
    const { error } = await supabase.from('tarefa').delete().eq('id', tarefa.id)

    if (error) {
      console.log('erro ao apagar tarefa', error)
      buscarTudo()
    }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  // "Bom dia" / "Boa tarde" / "Boa noite" de acordo com a hora
  function saudacao() {
    const hora = new Date().getHours()
    if (hora < 12) return 'Bom dia'
    if (hora < 18) return 'Boa tarde'
    return 'Boa noite'
  }

  const nome = usuario.email.split('@')[0]

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const feitas = conclusoes.length
  const total = tarefas.length
  const porcentagem = total === 0 ? 0 : (feitas / total) * 100

  return (
    <div className="tela-hoje">
      <div className="brilho-hoje"></div>

      <div className="conteudo-hoje">
        <header className="topo">
          <div>
            <p className="saudacao">
              {saudacao()}, {nome}
            </p>
            <p className="data-hoje">{dataFormatada}</p>
          </div>
          <button className="botao-sair" onClick={sair}>
            sair
          </button>
        </header>

        <div className="carteira">
          <span className="carteira-item">🪙 {perfil ? perfil.moedas : 0}</span>
          <span className="carteira-item">⭐ {perfil ? perfil.xp : 0} XP</span>
        </div>


        <section className="progresso">
          <div className="progresso-texto">
            <span>hoje</span>
            <span>
              {feitas} de {total}
            </span>
          </div>
          <div className="progresso-barra">
            <div
              className="progresso-preenchido"
              style={{ width: porcentagem + '%' }}
            ></div>
          </div>
          {total > 0 && feitas === total && (
            <p className="progresso-recado">
              tudo feito por hoje, pode descansar 💜
            </p>
          )}
        </section>

        <form className="form-nova" onSubmit={criarTarefa}>
          <div className="linha-campo">
            <input
              type="text"
              placeholder="o que você vai fazer hoje?"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={80}
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

        {carregando && <p className="aviso">carregando suas tarefas...</p>}

        {!carregando && total === 0 && (
          <div className="vazio">
            <div className="vazio-emoji">🌙</div>
            <p className="vazio-titulo">nenhuma missão por hoje</p>
            <p className="vazio-texto">
              escreve ali em cima a primeira coisa que você quer fazer. pode ser
              bem pequena, começar já conta.
            </p>
          </div>
        )}

        <ul className="lista">
          {tarefas.map((t) => {
            const cat = categorias.find((c) => c.id === t.categoria)
            const feita = estaFeita(t)

            return (
              <li key={t.id} className={feita ? 'tarefa tarefa-feita' : 'tarefa'}>
                <button
                  className={'marcador cor-' + t.categoria}
                  onClick={() => marcarTarefa(t)}
                  aria-label={feita ? 'desmarcar' : 'marcar como feita'}
                >
                  {feita ? '✓' : ''}
                </button>

                <div className="tarefa-texto">
                  <p className="tarefa-titulo">{t.titulo}</p>
                  {cat && (
                    <span className={'tarefa-categoria texto-' + t.categoria}>
                      {cat.emoji} {cat.nome}
                    </span>
                  )}
                </div>

                <button
                  className="botao-apagar"
                  onClick={() => apagarTarefa(t)}
                  aria-label="apagar tarefa"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>

        <footer className="rodape-hoje">dia 6 · tela do heroi</footer>
      </div>

      {/* aviso flutuante do que a tarefa rendeu */}
      {ganhoNaTela && (
        <div className="ganho">
          <span className="ganho-valores">
            +{ganhoNaTela.moedas} 🪙 · +{ganhoNaTela.xp} ⭐
            {ganhoNaTela.atributo && (
              <>
                {' '}
                · +{ganhoNaTela.pontos} {atributos[ganhoNaTela.atributo].emoji}
              </>
            )}
          </span>
          {ganhoNaTela.reduzido && (
            <span className="ganho-recado">
              já foi bastante {ganhoNaTela.nomeCategoria} hoje 🌱 esse veio
              menor, mas continua valendo
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default TelaHoje
