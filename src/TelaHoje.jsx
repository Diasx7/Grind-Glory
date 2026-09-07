import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { atributos, categorias, dataDeHoje, somarDias, tetoDeEnergia } from './jogo'
import './TelaHoje.css'

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

function TelaHoje({ usuario, diaAtual }) {
  const [tarefas, setTarefas] = useState([])
  const [conclusoes, setConclusoes] = useState([])
  const [perfil, setPerfil] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [categoria, setCategoria] = useState('estudo')
  const [repete, setRepete] = useState(false)
  const [dataEscolhida, setDataEscolhida] = useState(dataDeHoje())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [ganhoNaTela, setGanhoNaTela] = useState(null)
  const [emAndamento, setEmAndamento] = useState({})

  // tarefas ja planejadas pra amanha, so pra mostrar no painel de baixo
  const [tarefasDeAmanha, setTarefasDeAmanha] = useState([])
  const [mostrarAmanha, setMostrarAmanha] = useState(false)

  const tempoDoGanho = useRef(null)
  const inputTituloRef = useRef(null)

  // espelho do perfil, mas atualizado na hora (nao espera o re-render).
  // sem isso, marcar duas tarefas bem rapido fazia a segunda leitura pegar
  // o perfil desatualizado e a primeira recompensa se perdia.
  const perfilRef = useRef(null)

  function definirPerfil(novo) {
    perfilRef.current = novo
    setPerfil(novo)
  }

  useEffect(() => {
    buscarTudo()
    buscarTarefasDeAmanha()
    // busca de novo quando o dia vira (o App avisa via diaAtual), senao a
    // lista continuava mostrando as tarefas de ontem com o app aberto

    // o seletor de dia tambem precisa voltar pro "hoje" novo - senao, se a
    // pessoa tivesse deixado ele em "amanha" (que virou hoje) antes da
    // virada, uma tarefa criada depois ia cair silenciosamente em ontem
    setDataEscolhida(dataDeHoje())
  }, [diaAtual])

  async function buscarTarefasDeAmanha() {
    const amanha = somarDias(dataDeHoje(), 1)

    const { data, error } = await supabase
      .from('tarefa')
      .select('id, titulo, categoria')
      .eq('usuario_id', usuario.id)
      .eq('arquivada', false)
      .eq('recorrente', false)
      .eq('data_ref', amanha)
      .order('criada_em', { ascending: true })

    if (error) {
      console.log('erro ao buscar tarefas de amanha', error)
      return
    }

    setTarefasDeAmanha(data)
  }

  async function buscarTudo() {
    setErro(false)
    const hoje = dataDeHoje()

    // as tarefas marcadas pra hoje (data_ref) MAIS as rotinas, que nao
    // pertencem a um dia so e por isso aparecem todo dia. as arquivadas
    // ficam de fora sempre.
    const { data: listaTarefas, error: erroTarefas } = await supabase
      .from('tarefa')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('arquivada', false)
      .or('data_ref.eq.' + hoje + ',recorrente.eq.true')
      .order('recorrente', { ascending: false }) // rotinas primeiro
      .order('criada_em', { ascending: true })

    // e as conclusoes de hoje, que é o que diz se a tarefa ta feita
    const { data: listaConclusoes, error: erroConclusoes } = await supabase
      .from('conclusao')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('data', hoje)

    // maybeSingle porque no primeiro login o App ainda pode estar criando
    // essa linha; se vier null a tela so nao deixa concluir por um segundo
    const { data: dadosPerfil, error: erroPerfil } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    if (erroTarefas || erroConclusoes || erroPerfil) {
      console.log('erro ao buscar', erroTarefas || erroConclusoes || erroPerfil)
      setErro(true)
      setCarregando(false)
      return
    }

    setTarefas(listaTarefas)
    setConclusoes(listaConclusoes)
    definirPerfil(dadosPerfil)
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

  // quanta energia essa conclusao libera. batido o teto do dia, a tarefa
  // continua valendo moeda e atributo - so nao da mais fôlego de batalha.
  // le da ref (nao do estado) pelo mesmo motivo do mexerNoPerfil ali embaixo.
  function energiaAoConcluir() {
    return perfilRef.current.energia_ganha < tetoDeEnergia ? 1 : 0
  }

  // so devolve energia se ela ainda estiver na mao. se a tentativa ja foi
  // gasta na batalha, desmarcar nao tira nada de ninguem - assim nunca fica
  // negativo nem vira divida que come a energia de uma tarefa futura.
  function energiaAoDesmarcar() {
    return perfilRef.current.energia > 0 ? -1 : 0
  }

  // soma (ou devolve, se vier negativo) moeda, xp, atributo e energia.
  // parte da perfilRef, nao do estado "perfil": o estado so atualiza no
  // proximo render, entao marcar duas tarefas rapido faria a segunda conta
  // usar o mesmo numero de base da primeira e uma das recompensas sumiria.
  async function mexerNoPerfil(moedas, xp, atributo, pontos, energia) {
    const base = perfilRef.current
    if (!base) return

    const novo = {
      moedas: Math.max(0, base.moedas + moedas),
      xp: Math.max(0, base.xp + xp),
      // os dois andam juntos: ganhar sobe o saldo e o contador do teto,
      // devolver desce os dois (liberando a vaga no teto de novo)
      energia: Math.max(0, base.energia + energia),
      energia_ganha: Math.max(0, base.energia_ganha + energia),
    }

    // cada atributo é uma coluna diferente, entao monto a chave na hora
    if (atributo) {
      novo[atributo] = Math.max(0, base[atributo] + pontos)
    }

    definirPerfil({ ...base, ...novo })

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
    setErroForm('')

    const textoLimpo = titulo.trim()
    if (!textoLimpo) return

    const hoje = dataDeHoje()
    // rotina sempre começa hoje (o seletor de dia fica escondido quando
    // repete ta ligado); se o campo de data ficar vazio por algum motivo,
    // cai em hoje tambem, nunca fica sem data_ref nenhuma
    const diaDaTarefa = repete ? hoje : dataEscolhida || hoje

    // nao mando dificuldade: o trigger do banco calcula ela pela categoria
    const { data, error } = await supabase
      .from('tarefa')
      .insert({
        usuario_id: usuario.id,
        titulo: textoLimpo,
        categoria: categoria,
        // numa rotina o data_ref vira "desde quando ela existe"
        data_ref: diaDaTarefa,
        recorrente: repete,
      })
      .select()
      .single()

    if (error) {
      console.log('erro ao criar tarefa', error)
      setErroForm('não consegui salvar essa tarefa, tenta de novo')
      return
    }

    setTitulo('')
    // desligo o repete de novo de proposito: rotina criada sem querer
    // volta todo dia e so sai arquivando, entao prefiro pedir de novo
    setRepete(false)

    // so entra na lista de hoje se for pra hoje - uma tarefa criada pra
    // amanha nao pode aparecer nem contar na tela agora
    if (data.recorrente || data.data_ref === hoje) {
      setTarefas([...tarefas, data])
    }

    if (data.data_ref === somarDias(hoje, 1)) {
      setTarefasDeAmanha((atual) => [...atual, data])
    }
  }

  // atalho: pula direto pro formulario ja com "amanha" selecionado
  function focarEmAmanha() {
    setDataEscolhida(somarDias(dataDeHoje(), 1))
    inputTituloRef.current?.focus()
  }

  function marcarTarefa(tarefa) {
    // ja tem uma marcacao dessa tarefa em andamento - ignora o clique extra
    // (evita o duplo toque contar a recompensa duas vezes)
    if (emAndamento[tarefa.id]) return

    if (estaFeita(tarefa)) {
      desconcluir(tarefa)
    } else {
      concluir(tarefa)
    }
  }

  async function concluir(tarefa) {
    // sem perfil carregado eu nao teria onde somar a moeda, entao nem começo
    if (!perfil) return

    setEmAndamento((atual) => ({ ...atual, [tarefa.id]: true }))

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
      setEmAndamento((atual) => ({ ...atual, [tarefa.id]: false }))
      return
    }

    // forma funcional: se duas tarefas forem marcadas quase juntas, cada
    // setConclusoes pega a lista mais nova em vez de duas partindo da mesma base
    setConclusoes((atual) => [...atual, data])

    const energia = energiaAoConcluir()
    mexerNoPerfil(ganho.moedas, ganho.xp, ganho.atributo, ganho.pontos, energia)

    const cat = categorias.find((c) => c.id === tarefa.categoria)
    mostrarGanho({ ...ganho, energia: energia }, cat ? cat.nome : '')
    setEmAndamento((atual) => ({ ...atual, [tarefa.id]: false }))
  }

  async function desconcluir(tarefa) {
    const conclusao = conclusoes.find((c) => c.tarefa_id === tarefa.id)
    if (!conclusao) return

    setEmAndamento((atual) => ({ ...atual, [tarefa.id]: true }))

    const { error } = await supabase
      .from('conclusao')
      .delete()
      .eq('id', conclusao.id)

    if (error) {
      console.log('erro ao desconcluir', error)
      setEmAndamento((atual) => ({ ...atual, [tarefa.id]: false }))
      return
    }

    setConclusoes((atual) => atual.filter((c) => c.id !== conclusao.id))
    setEmAndamento((atual) => ({ ...atual, [tarefa.id]: false }))

    // devolve exatamente o que essa conclusao tinha dado
    mexerNoPerfil(
      -conclusao.moedas,
      -conclusao.xp,
      conclusao.atributo,
      -conclusao.pontos_atributo,
      energiaAoDesmarcar(),
    )
  }

  // o mesmo ✕ faz coisas diferentes: tarefa solta some, rotina é arquivada
  function apagarOuArquivar(tarefa) {
    if (tarefa.recorrente) {
      arquivarTarefa(tarefa)
    } else {
      apagarTarefa(tarefa)
    }
  }

  // parar uma rotina nao apaga nada. as conclusoes antigas continuam no
  // banco alimentando o heroi, a tarefa so para de aparecer aqui.
  async function arquivarTarefa(tarefa) {
    const confirmou = window.confirm(
      'parar de repetir "' +
        tarefa.titulo +
        '"?\n\no que você já fez continua contando pro seu herói.',
    )
    if (!confirmou) return

    setTarefas(tarefas.filter((t) => t.id !== tarefa.id))

    const { error } = await supabase
      .from('tarefa')
      .update({ arquivada: true })
      .eq('id', tarefa.id)

    if (error) {
      console.log('erro ao arquivar a rotina', error)
      buscarTudo()
    }
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
        energiaAoDesmarcar(),
      )
    }

    setTarefas(tarefas.filter((t) => t.id !== tarefa.id))
    setConclusoes((atual) => atual.filter((c) => c.tarefa_id !== tarefa.id))

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

  // enquanto o perfil ainda ta carregando cai no pedaço do email, so pra
  // nao aparecer em branco por um instante
  const nome = (perfil && perfil.nome) || usuario.email.split('@')[0]

  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // conto pelas tarefas visiveis, nao por conclusoes.length: se eu arquivar
  // uma rotina ja feita hoje, a conclusao dela continua no banco e o contador
  // marcaria "3 de 2"
  const feitas = tarefas.filter((t) => estaFeita(t)).length
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
          <span className="carteira-item">
            🔋 {perfil ? perfil.energia : 0}/{tetoDeEnergia}
          </span>
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
              ref={inputTituloRef}
              type="text"
              placeholder="o que você vai fazer?"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={80}
            />
            <button type="submit" className="botao-add" aria-label="adicionar">
              +
            </button>
          </div>

          {/* escondido quando é rotina: rotina aparece todo dia, entao
              escolher um dia especifico pra ela nao faz sentido aqui */}
          {!repete && (
            <div className="seletor-dia">
              <button
                type="button"
                className={
                  dataEscolhida === dataDeHoje() ? 'chip chip-dia-ativo' : 'chip'
                }
                onClick={() => setDataEscolhida(dataDeHoje())}
              >
                Hoje
              </button>
              <button
                type="button"
                className={
                  dataEscolhida === somarDias(dataDeHoje(), 1)
                    ? 'chip chip-dia-ativo'
                    : 'chip'
                }
                onClick={() => setDataEscolhida(somarDias(dataDeHoje(), 1))}
              >
                Amanhã
              </button>
              <input
                type="date"
                className="input-data"
                value={dataEscolhida}
                min={dataDeHoje()}
                onChange={(e) => setDataEscolhida(e.target.value)}
              />
            </div>
          )}

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

          {/* fica numa linha separada dos chips porque nao é categoria,
              é outra coisa: se a tarefa volta amanha ou nao */}
          <button
            type="button"
            className={repete ? 'chip-repete chip-repete-ativo' : 'chip-repete'}
            onClick={() => {
              const novoRepete = !repete
              setRepete(novoRepete)
              // rotina sempre começa hoje - se a pessoa tinha escolhido
              // outro dia antes, o seletor volta escondido e resetado
              if (novoRepete) setDataEscolhida(dataDeHoje())
            }}
          >
            🔁 repete todo dia
          </button>

          {erroForm && <p className="erro-form">{erroForm}</p>}
        </form>

        {/* painel colapsavel pra ver/adicionar o que ja ta planejado pra
            amanha, sem precisar sair da tela Hoje */}
        <section className="painel-amanha">
          <button
            type="button"
            className="amanha-toggle"
            onClick={() => setMostrarAmanha(!mostrarAmanha)}
          >
            <span>📅 planejar amanhã</span>
            <span className="amanha-contagem">
              {tarefasDeAmanha.length > 0
                ? tarefasDeAmanha.length + (tarefasDeAmanha.length === 1 ? ' tarefa' : ' tarefas')
                : 'nada ainda'}
            </span>
          </button>

          {mostrarAmanha && (
            <div className="amanha-conteudo">
              {tarefasDeAmanha.length === 0 && (
                <p className="amanha-vazio">nada planejado pra amanhã ainda.</p>
              )}

              {tarefasDeAmanha.length > 0 && (
                <ul className="amanha-lista">
                  {tarefasDeAmanha.map((t) => {
                    const cat = categorias.find((c) => c.id === t.categoria)
                    return (
                      <li key={t.id}>
                        {cat ? cat.emoji : ''} {t.titulo}
                      </li>
                    )
                  })}
                </ul>
              )}

              <button
                type="button"
                className="botao-focar-amanha"
                onClick={focarEmAmanha}
              >
                + adicionar pra amanhã
              </button>
            </div>
          )}
        </section>

        {carregando && <p className="aviso">carregando suas tarefas...</p>}

        {!carregando && erro && (
          <div className="vazio">
            <div className="vazio-emoji">📡</div>
            <p className="vazio-titulo">não consegui carregar suas tarefas</p>
            <p className="vazio-texto">confere sua internet e tenta de novo.</p>
            <button className="botao-tentar-de-novo" onClick={buscarTudo}>
              tentar de novo
            </button>
          </div>
        )}

        {!carregando && !erro && total === 0 && (
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
                  disabled={!!emAndamento[t.id]}
                  aria-label={feita ? 'desmarcar' : 'marcar como feita'}
                >
                  {feita ? '✓' : ''}
                </button>

                <div className="tarefa-texto">
                  <p className="tarefa-titulo">{t.titulo}</p>
                  <span className="tarefa-linha-de-baixo">
                    {cat && (
                      <span className={'tarefa-categoria texto-' + t.categoria}>
                        {cat.emoji} {cat.nome}
                      </span>
                    )}
                    {t.recorrente && (
                      <span className="marca-rotina">🔁 todo dia</span>
                    )}
                  </span>
                </div>

                <button
                  className="botao-apagar"
                  onClick={() => apagarOuArquivar(t)}
                  aria-label={t.recorrente ? 'parar de repetir' : 'apagar tarefa'}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
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
            {ganhoNaTela.energia > 0 && <> · +1 🔋</>}
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
