import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './TelaHoje.css'

// as categorias do jogo. a dificuldade de cada uma tambem vive no trigger
// aplicar_dificuldade() la no banco - mexeu aqui, mexe la tambem.
const categorias = [
  { id: 'estudo', nome: 'Estudo', emoji: '📘' },
  { id: 'leitura', nome: 'Leitura', emoji: '📖' },
  { id: 'exercicio', nome: 'Exercício', emoji: '💪' },
  { id: 'saude', nome: 'Saúde', emoji: '🌿' },
  { id: 'trabalho', nome: 'Trabalho', emoji: '💼' },
  { id: 'organizacao', nome: 'Organização', emoji: '🧹' },
]

// o hoje no fuso do celular, no formato que o banco espera (2026-08-18).
// NAO usar toISOString aqui: ele converte pra UTC e as tarefas da noite
// pulavam pro dia seguinte.
function dataDeHoje() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return agora.getFullYear() + '-' + mes + '-' + dia
}

function TelaHoje({ usuario }) {
  const [tarefas, setTarefas] = useState([])
  const [conclusoes, setConclusoes] = useState([])
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')
  const [carregando, setCarregando] = useState(true)

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

    if (erroTarefas || erroConclusoes) {
      console.log('erro ao buscar', erroTarefas || erroConclusoes)
      setCarregando(false)
      return
    }

    setTarefas(listaTarefas)
    setConclusoes(listaConclusoes)
    setCarregando(false)
  }

  // tarefa feita agora é "existe conclusao dela hoje", nao é mais um booleano
  function estaFeita(tarefa) {
    return conclusoes.some((c) => c.tarefa_id === tarefa.id)
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
    const { data, error } = await supabase
      .from('conclusao')
      .insert({
        tarefa_id: tarefa.id,
        usuario_id: usuario.id,
        data: dataDeHoje(),
      })
      .select()
      .single()

    if (error) {
      console.log('erro ao concluir', error)
      return
    }

    setConclusoes([...conclusoes, data])
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
  }

  async function apagarTarefa(tarefa) {
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

        <footer className="rodape-hoje">dia 3 · tela de hoje</footer>
      </div>
    </div>
  )
}

export default TelaHoje
