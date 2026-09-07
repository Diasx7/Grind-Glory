import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { categorias, dataDeHoje, nomeDoDia, somarDias } from './jogo'
import './TelaSemana.css'

function TelaSemana({ usuario, diaAtual }) {
  // guarda as tarefas separadas por dia: { '2026-09-08': [tarefa, ...], ... }
  const [tarefasPorDia, setTarefasPorDia] = useState({})
  const [feitasHoje, setFeitasHoje] = useState([]) // ids de tarefa ja concluidas hoje
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  // formulario de adicionar tarefa - so um dia aberto por vez
  const [diaAberto, setDiaAberto] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')

  const hoje = dataDeHoje()
  const dias = []
  for (let i = 0; i < 7; i++) {
    dias.push(somarDias(hoje, i))
  }

  useEffect(() => {
    buscarSemana()
  }, [diaAtual])

  async function buscarSemana() {
    setErro(false)
    const ultimoDia = dias[dias.length - 1]

    // tarefas da semana: as com data_ref dentro dos 7 dias, mais as
    // rotinas (que aparecem todo dia, igual na tela Hoje)
    const { data, error } = await supabase
      .from('tarefa')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('arquivada', false)
      .or('and(data_ref.gte.' + hoje + ',data_ref.lte.' + ultimoDia + '),recorrente.eq.true')
      .order('criada_em', { ascending: true })

    // so pra saber quais de hoje ja foram feitas (mostra riscado, mas
    // marcar so pode na tela Hoje mesmo)
    const { data: conclusoesHoje, error: erroConclusoes } = await supabase
      .from('conclusao')
      .select('tarefa_id')
      .eq('usuario_id', usuario.id)
      .eq('data', hoje)

    if (error || erroConclusoes) {
      console.log('erro ao buscar a semana', error || erroConclusoes)
      setErro(true)
      setCarregando(false)
      return
    }

    // agrupa: rotina entra em todos os dias, tarefa normal so no dia dela
    const porDia = {}
    dias.forEach((d) => {
      porDia[d] = []
    })

    data.forEach((t) => {
      if (t.recorrente) {
        dias.forEach((d) => porDia[d].push(t))
      } else if (porDia[t.data_ref]) {
        porDia[t.data_ref].push(t)
      }
    })

    setTarefasPorDia(porDia)
    setFeitasHoje(conclusoesHoje.map((c) => c.tarefa_id))
    setCarregando(false)
  }

  async function criarTarefaNoDia(e, dia) {
    e.preventDefault()

    const textoLimpo = titulo.trim()
    if (!textoLimpo) return

    const { data, error } = await supabase
      .from('tarefa')
      .insert({
        usuario_id: usuario.id,
        titulo: textoLimpo,
        categoria: categoria,
        data_ref: dia,
        recorrente: false,
      })
      .select()
      .single()

    if (error) {
      console.log('erro ao criar tarefa na semana', error)
      return
    }

    setTarefasPorDia((atual) => ({
      ...atual,
      [dia]: [...atual[dia], data],
    }))

    setTitulo('')
    setDiaAberto(null)
  }

  // apagar/arquivar so é permitido de dias futuros (indice > 0). o dia de
  // hoje ja pode ter tarefa concluida com recompensa dada, e apagar aqui
  // levaria a conclusao junto sem devolver moeda/xp - isso a tela Hoje ja
  // trata direito, entao hoje se mexe so por la.
  async function apagarOuArquivar(tarefa) {
    if (tarefa.recorrente) {
      const confirmou = window.confirm(
        'parar de repetir "' +
          tarefa.titulo +
          '"?\n\no que você já fez continua contando pro seu herói.',
      )
      if (!confirmou) return

      setTarefasPorDia((atual) => {
        const novo = {}
        for (const dia in atual) {
          novo[dia] = atual[dia].filter((t) => t.id !== tarefa.id)
        }
        return novo
      })

      const { error } = await supabase
        .from('tarefa')
        .update({ arquivada: true })
        .eq('id', tarefa.id)

      if (error) {
        console.log('erro ao arquivar a rotina', error)
        buscarSemana()
      }
      return
    }

    setTarefasPorDia((atual) => ({
      ...atual,
      [tarefa.data_ref]: atual[tarefa.data_ref].filter((t) => t.id !== tarefa.id),
    }))

    const { error } = await supabase.from('tarefa').delete().eq('id', tarefa.id)

    if (error) {
      console.log('erro ao apagar tarefa', error)
      buscarSemana()
    }
  }

  if (carregando) {
    return (
      <div className="tela-semana">
        <p className="semana-aviso">carregando a semana...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="tela-semana">
        <div className="semana-erro">
          <p className="semana-aviso">não consegui carregar a semana. confere sua internet.</p>
          <button className="botao-tentar-de-novo" onClick={buscarSemana}>
            tentar de novo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tela-semana">
      <div className="brilho-semana"></div>

      <div className="conteudo-semana">
        <header className="topo-semana">
          <h1 className="titulo-semana">Semana</h1>
          <p className="subtitulo-semana">os próximos 7 dias</p>
        </header>

        <div className="lista-dias">
          {dias.map((dia, indice) => {
            const tarefasDoDia = tarefasPorDia[dia] || []
            const dataObj = new Date(dia.split('-')[0], dia.split('-')[1] - 1, dia.split('-')[2])
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
              day: 'numeric',
              month: 'long',
            })
            const ehHoje = indice === 0

            return (
              <div key={dia} className={ehHoje ? 'dia-card dia-card-hoje' : 'dia-card'}>
                <div className="dia-topo">
                  <div>
                    <span className="dia-nome">{nomeDoDia(dia, hoje)}</span>
                    <span className="dia-data">{dataFormatada}</span>
                  </div>
                  <button
                    type="button"
                    className="botao-add-dia"
                    onClick={() => setDiaAberto(diaAberto === dia ? null : dia)}
                    aria-label="adicionar tarefa nesse dia"
                  >
                    {diaAberto === dia ? '×' : '+'}
                  </button>
                </div>

                {tarefasDoDia.length === 0 && (
                  <p className="dia-vazio">nada planejado ainda</p>
                )}

                {tarefasDoDia.length > 0 && (
                  <ul className="dia-lista">
                    {tarefasDoDia.map((t) => {
                      const cat = categorias.find((c) => c.id === t.categoria)
                      const feita = ehHoje && feitasHoje.includes(t.id)

                      return (
                        <li
                          key={t.id}
                          className={feita ? 'dia-tarefa dia-tarefa-feita' : 'dia-tarefa'}
                        >
                          <span className="dia-tarefa-texto">
                            {cat ? cat.emoji : ''} {t.titulo}
                            {t.recorrente && <span className="marca-rotina-semana"> 🔁</span>}
                          </span>

                          {/* so deixa apagar/arquivar de dias futuros - ver
                              comentario de apagarOuArquivar sobre o motivo */}
                          {(indice > 0 || t.recorrente) && (
                            <button
                              type="button"
                              className="botao-apagar"
                              onClick={() => apagarOuArquivar(t)}
                              aria-label={t.recorrente ? 'parar de repetir' : 'apagar tarefa'}
                            >
                              ✕
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {diaAberto === dia && (
                  <form
                    className="form-dia"
                    onSubmit={(e) => criarTarefaNoDia(e, dia)}
                  >
                    <input
                      type="text"
                      placeholder="o que vai fazer nesse dia?"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      maxLength={80}
                      autoFocus
                    />

                    <div className="chips-dia">
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

                    <button type="submit" className="botao-add-dia-confirma">
                      adicionar
                    </button>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TelaSemana
