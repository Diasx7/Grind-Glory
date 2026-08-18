import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './TelaHoje.css'

// as 3 categorias do comeco, por enquanto fixas mesmo
const categorias = [
  { id: 'estudo', nome: 'Estudo', emoji: '📘' },
  { id: 'saude', nome: 'Saúde', emoji: '🌿' },
  { id: 'organizacao', nome: 'Organização', emoji: '🧹' },
]

// meia noite de hoje, pra pegar só as tarefas do dia
function inicioDeHoje() {
  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  return agora.toISOString()
}

function TelaHoje({ usuario }) {
  const [tarefas, setTarefas] = useState([])
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarTarefas()
  }, [])

  async function buscarTarefas() {
    const { data, error } = await supabase
      .from('tarefa')
      .select('*')
      .eq('usuario_id', usuario.id)
      .gte('criada_em', inicioDeHoje())
      .order('feita_hoje', { ascending: true }) // as feitas descem pro fim da lista
      .order('criada_em', { ascending: true })

    if (error) {
      console.log('erro ao buscar tarefas', error)
      setCarregando(false)
      return
    }

    setTarefas(data)
    setCarregando(false)
  }

  async function criarTarefa(e) {
    e.preventDefault()

    const textoLimpo = titulo.trim()
    if (!textoLimpo) return

    const { data, error } = await supabase
      .from('tarefa')
      .insert({
        usuario_id: usuario.id,
        titulo: textoLimpo,
        categoria: categoria,
        dificuldade: 1,
        recorrente: false,
        feita_hoje: false,
      })
      .select()
      .single()

    if (error) {
      console.log('erro ao criar tarefa', error)
      alert('nao consegui salvar essa tarefa, tenta de novo')
      return
    }

    // ja limpa o campo e joga a tarefa na lista, sem esperar recarregar tudo
    setTitulo('')
    setTarefas([...tarefas, data])
  }

  async function marcarTarefa(tarefa) {
    const novoValor = !tarefa.feita_hoje

    // muda na tela primeiro pra parecer instantaneo, depois salva no banco
    setTarefas(
      tarefas.map((t) =>
        t.id === tarefa.id ? { ...t, feita_hoje: novoValor } : t,
      ),
    )

    const { error } = await supabase
      .from('tarefa')
      .update({ feita_hoje: novoValor })
      .eq('id', tarefa.id)

    // se o banco recusou, recarrega pra tela nao mentir
    if (error) {
      console.log('erro ao marcar tarefa', error)
      buscarTarefas()
    }
  }

  async function apagarTarefa(tarefa) {
    setTarefas(tarefas.filter((t) => t.id !== tarefa.id))

    const { error } = await supabase.from('tarefa').delete().eq('id', tarefa.id)

    if (error) {
      console.log('erro ao apagar tarefa', error)
      buscarTarefas()
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

  const dataDeHoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const feitas = tarefas.filter((t) => t.feita_hoje).length
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
            <p className="data-hoje">{dataDeHoje}</p>
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

            return (
              <li
                key={t.id}
                className={t.feita_hoje ? 'tarefa tarefa-feita' : 'tarefa'}
              >
                <button
                  className={'marcador cor-' + t.categoria}
                  onClick={() => marcarTarefa(t)}
                  aria-label={t.feita_hoje ? 'desmarcar' : 'marcar como feita'}
                >
                  {t.feita_hoje ? '✓' : ''}
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
