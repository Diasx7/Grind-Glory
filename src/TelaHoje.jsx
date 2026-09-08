import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import {
  atributoMaisEsquecido,
  atributos,
  categorias,
  convites,
  dataDeHoje,
  objetivoMaisParado,
  somarDias,
  tetoDeEnergia,
} from './jogo'
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

  // "repetir plano de ontem" - copia tarefas de um dia anterior pra amanha
  const [diaParaCopiar, setDiaParaCopiar] = useState(somarDias(dataDeHoje(), -1))
  const [tarefasParaCopiar, setTarefasParaCopiar] = useState([])
  const [selecionadasParaCopiar, setSelecionadasParaCopiar] = useState({})
  const [carregandoCopia, setCarregandoCopia] = useState(false)
  const [copiando, setCopiando] = useState(false)

  // sugestao do espelho: o atributo mais esquecido, com um toque pra
  // adicionar uma tarefa daquele tipo pra amanha
  const [sugestao, setSugestao] = useState(null)
  const [adicionandoSugestao, setAdicionandoSugestao] = useState(false)

  // editar tarefa - so uma por vez
  const [editandoId, setEditandoId] = useState(null)
  const [tituloEdit, setTituloEdit] = useState('')
  const [categoriaEdit, setCategoriaEdit] = useState('')
  const [dataEdit, setDataEdit] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)
  const [erroEdit, setErroEdit] = useState('')

  // objetivos ativos - pra vincular tarefa nova, sugerir passo pra um
  // parado, e empurrar o progresso quando a tarefa vinculada é concluida
  const [objetivos, setObjetivos] = useState([])
  const [objetivoVinculado, setObjetivoVinculado] = useState('')
  const [incrementoObjetivo, setIncrementoObjetivo] = useState('')
  const [sugestaoObjetivo, setSugestaoObjetivo] = useState(null)
  const [celebracao, setCelebracao] = useState(null)

  // mesma ideia do perfilRef: espelho atualizado na hora, pra duas
  // conclusoes seguidas nao lerem o mesmo progresso desatualizado
  const objetivosRef = useRef({})

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
    buscarSugestao()
    buscarObjetivos()
    // busca de novo quando o dia vira (o App avisa via diaAtual), senao a
    // lista continuava mostrando as tarefas de ontem com o app aberto

    // o seletor de dia tambem precisa voltar pro "hoje" novo - senao, se a
    // pessoa tivesse deixado ele em "amanha" (que virou hoje) antes da
    // virada, uma tarefa criada depois ia cair silenciosamente em ontem
    setDataEscolhida(dataDeHoje())
    // mesma ideia pro "copiar de ontem": ontem tambem anda um dia
    setDiaParaCopiar(somarDias(dataDeHoje(), -1))
  }, [diaAtual])

  // olha o historico inteiro de conclusoes e acha o atributo mais esquecido,
  // pra sugerir uma tarefa daquele tipo no painel de planejar amanha
  async function buscarSugestao() {
    const { data, error } = await supabase
      .from('conclusao')
      .select('atributo, data')
      .eq('usuario_id', usuario.id)
      .order('data', { ascending: false })

    if (error) {
      console.log('erro ao buscar historico pra sugestao', error)
      return
    }

    // sem nenhum historico ainda nao é "esquecido", é so um comeco -
    // nao faz sentido sugerir nada pra quem nunca completou nada
    if (data.length === 0) {
      setSugestao(null)
      return
    }

    setSugestao(atributoMaisEsquecido(data))
  }

  // um toque: cria a tarefa sugerida direto pra amanha, ja com a
  // categoria certa. o titulo vem do convite - se nao servir, dá pra
  // editar depois (ver botao-editar na lista)
  async function adicionarSugestao() {
    if (!sugestao) return

    setAdicionandoSugestao(true)

    const cat = categorias.find((c) => c.atributo === sugestao.atributo)
    const amanha = somarDias(dataDeHoje(), 1)

    const { data, error } = await supabase
      .from('tarefa')
      .insert({
        usuario_id: usuario.id,
        titulo: convites[sugestao.atributo],
        categoria: cat.id,
        data_ref: amanha,
        recorrente: false,
      })
      .select()
      .single()

    setAdicionandoSugestao(false)

    if (error) {
      console.log('erro ao adicionar a sugestao', error)
      return
    }

    setTarefasDeAmanha((atual) => [...atual, data])
    // a sugestao ja foi atendida - some ate a proxima busca (troca de dia
    // ou o app reabrir) em vez de continuar oferecendo a mesma coisa
    setSugestao(null)
  }

  // busca os objetivos ativos - pra popular o seletor de vincular na hora
  // de criar tarefa, e pra ver se algum ta parado ha muitos dias
  async function buscarObjetivos() {
    const { data, error } = await supabase
      .from('objetivo')
      .select('*')
      .eq('usuario_id', usuario.id)
      .eq('status', 'ativo')
      .order('criado_em', { ascending: true })

    if (error) {
      console.log('erro ao buscar objetivos', error)
      return
    }

    const porId = {}
    data.forEach((o) => {
      porId[o.id] = o
    })
    objetivosRef.current = porId

    setObjetivos(data)
    setSugestaoObjetivo(objetivoMaisParado(data))
  }

  // atalho: pula pro formulario ja com "amanha" e o objetivo selecionados
  function focarEmObjetivo(objetivoId) {
    setDataEscolhida(somarDias(dataDeHoje(), 1))
    setObjetivoVinculado(String(objetivoId))
    inputTituloRef.current?.focus()
  }

  // soma (ou devolve) progresso num objetivo quando uma tarefa vinculada é
  // concluida/desmarcada. mesma ideia da perfilRef: le e escreve na ref,
  // nao no estado, pra duas conclusoes rapidas nao pegarem o mesmo numero
  // de base uma da outra.
  async function mexerNoObjetivo(objetivoId, incremento) {
    const atual = objetivosRef.current[objetivoId]
    if (!atual) return // pode ter sido arquivado nesse meio tempo

    const novoProgresso = Math.max(0, Number(atual.progresso) + incremento)
    const mudancas = { progresso: novoProgresso }

    if (incremento > 0) {
      mudancas.ultima_atividade = dataDeHoje()
    }

    // bateu o alvo agora? conclui e avisa a celebracao. se a pessoa
    // desmarcar depois a tarefa que completou, volta a ficar ativo -
    // senao o status ficaria mentindo (concluido com progresso < alvo).
    if (atual.status === 'ativo' && novoProgresso >= Number(atual.alvo)) {
      mudancas.status = 'concluido'
      mudancas.concluido_em = new Date().toISOString()
    } else if (atual.status === 'concluido' && novoProgresso < Number(atual.alvo)) {
      mudancas.status = 'ativo'
      mudancas.concluido_em = null
    }

    const atualizado = { ...atual, ...mudancas }
    objetivosRef.current = { ...objetivosRef.current, [objetivoId]: atualizado }

    // so continua na lista (e no seletor) enquanto ativo - concluido some
    // do dia a dia, mas fica guardado na aba Objetivos
    if (atualizado.status === 'ativo') {
      setObjetivos((atual2) => atual2.map((o) => (o.id === objetivoId ? atualizado : o)))
    } else {
      setObjetivos((atual2) => atual2.filter((o) => o.id !== objetivoId))
    }

    const { error } = await supabase.from('objetivo').update(mudancas).eq('id', objetivoId)

    if (error) {
      console.log('erro ao atualizar o objetivo', error)
    }

    if (mudancas.status === 'concluido') {
      setCelebracao(atualizado)
    }
  }

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

  // busca as tarefas de um dia especifico pra mostrar no "repetir plano" -
  // so quando o painel de amanha ta aberto, nao precisa toda hora
  useEffect(() => {
    if (mostrarAmanha) {
      buscarTarefasParaCopiar(diaParaCopiar)
    }
  }, [mostrarAmanha, diaParaCopiar])

  async function buscarTarefasParaCopiar(dia) {
    setCarregandoCopia(true)

    const { data, error } = await supabase
      .from('tarefa')
      .select('id, titulo, categoria')
      .eq('usuario_id', usuario.id)
      .eq('arquivada', false)
      .eq('recorrente', false)
      .eq('data_ref', dia)
      .order('criada_em', { ascending: true })

    if (error) {
      console.log('erro ao buscar tarefas pra copiar', error)
      setCarregandoCopia(false)
      return
    }

    setTarefasParaCopiar(data)
    // todas ja vem marcadas - o caminho de um toque so é nao mexer em nada
    // e apertar "copiar"
    const marcadas = {}
    data.forEach((t) => {
      marcadas[t.id] = true
    })
    setSelecionadasParaCopiar(marcadas)
    setCarregandoCopia(false)
  }

  function alternarSelecaoCopia(id) {
    setSelecionadasParaCopiar((atual) => ({ ...atual, [id]: !atual[id] }))
  }

  async function copiarParaAmanha() {
    const selecionadas = tarefasParaCopiar.filter((t) => selecionadasParaCopiar[t.id])
    if (selecionadas.length === 0) return

    setCopiando(true)

    const amanha = somarDias(dataDeHoje(), 1)
    const novas = selecionadas.map((t) => ({
      usuario_id: usuario.id,
      titulo: t.titulo,
      categoria: t.categoria,
      data_ref: amanha,
      recorrente: false,
    }))

    const { data, error } = await supabase.from('tarefa').insert(novas).select()

    setCopiando(false)

    if (error) {
      console.log('erro ao copiar tarefas', error)
      return
    }

    setTarefasDeAmanha((atual) => [...atual, ...data])
    // some com a lista de "pra copiar": ja copiou o que tinha, nao faz
    // sentido oferecer copiar de novo o mesmo dia
    setTarefasParaCopiar([])
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

    // se vinculou a um objetivo "por valor", precisa dizer quanto essa
    // tarefa especifica adianta. em "por etapas" nao pergunta nada, o
    // avanço é sempre 1 - é assim que a etapa vira algo pequeno e simples.
    const objetivoEscolhido = objetivos.find((o) => String(o.id) === objetivoVinculado)
    let incremento = null

    if (objetivoEscolhido) {
      if (objetivoEscolhido.tipo === 'valor') {
        const valorNumero = Number(incrementoObjetivo)
        if (!valorNumero || valorNumero <= 0) {
          setErroForm('quanto essa tarefa adianta no objetivo? preenche o valor.')
          return
        }
        incremento = valorNumero
      } else {
        incremento = 1
      }
    }

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
        objetivo_id: objetivoEscolhido ? objetivoEscolhido.id : null,
        objetivo_incremento: incremento,
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
    // o objetivo vinculado fica (é comum criar varias tarefas seguidas
    // pro mesmo objetivo numa sessao de planejamento), mas o valor especifico
    // de cada uma nao - senao a proxima tarefa herdava o numero da anterior
    setIncrementoObjetivo('')

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

    // se essa tarefa empurra um objetivo, avança ele tambem
    if (tarefa.objetivo_id) {
      mexerNoObjetivo(tarefa.objetivo_id, Number(tarefa.objetivo_incremento) || 0)
    }

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

    if (tarefa.objetivo_id) {
      mexerNoObjetivo(tarefa.objetivo_id, -(Number(tarefa.objetivo_incremento) || 0))
    }
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

      if (tarefa.objetivo_id) {
        mexerNoObjetivo(tarefa.objetivo_id, -(Number(tarefa.objetivo_incremento) || 0))
      }
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

  function comecarEditar(tarefa) {
    setEditandoId(tarefa.id)
    setTituloEdit(tarefa.titulo)
    setCategoriaEdit(tarefa.categoria)
    setDataEdit(tarefa.data_ref)
    setErroEdit('')
  }

  function cancelarEdicao() {
    setEditandoId(null)
  }

  async function salvarEdicao(e, tarefa) {
    e.preventDefault()

    const tituloLimpo = tituloEdit.trim()
    if (!tituloLimpo) return

    setSalvandoEdit(true)
    setErroEdit('')

    const mudancas = { titulo: tituloLimpo, categoria: categoriaEdit }

    // so manda o dia novo se a tarefa ainda nao foi concluida hoje e nao é
    // rotina: mudar o dia de uma tarefa ja feita deixaria ela "sem
    // conclusao" no dia novo, como se nunca tivesse sido feita, mesmo com
    // a recompensa ja dada - a conclusao em si nunca é tocada aqui, so o
    // que aponta pra ela.
    if (!tarefa.recorrente && !estaFeita(tarefa)) {
      mudancas.data_ref = dataEdit || dataDeHoje()
    }

    // o trigger aplicar_dificuldade() do banco recalcula a dificuldade
    // sozinho quando a categoria muda - nao precisa mandar ela aqui
    const { data, error } = await supabase
      .from('tarefa')
      .update(mudancas)
      .eq('id', tarefa.id)
      .select()
      .single()

    setSalvandoEdit(false)

    if (error) {
      console.log('erro ao editar tarefa', error)
      setErroEdit('não consegui salvar, tenta de novo')
      return
    }

    // se o dia mudou pra fora de hoje, a tarefa some da lista - mesma regra
    // de sempre, so mostra o que é de hoje ou rotina
    if (data.recorrente || data.data_ref === dataDeHoje()) {
      setTarefas((atual) => atual.map((t) => (t.id === tarefa.id ? data : t)))
    } else {
      setTarefas((atual) => atual.filter((t) => t.id !== tarefa.id))
      if (data.data_ref === somarDias(dataDeHoje(), 1)) {
        setTarefasDeAmanha((atual) => [...atual, data])
      }
    }

    setEditandoId(null)
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

  // pra saber se mostra o campo de "quanto isso adianta" no formulario
  const objetivoNoForm = objetivos.find((o) => String(o.id) === objetivoVinculado)

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

          {/* vincular a tarefa num objetivo grande - opcional, so aparece
              se ja existir algum objetivo ativo */}
          {objetivos.length > 0 && (
            <div className="seletor-objetivo">
              <select
                className="select-objetivo"
                value={objetivoVinculado}
                onChange={(e) => {
                  setObjetivoVinculado(e.target.value)
                  setIncrementoObjetivo('')
                }}
              >
                <option value="">🎯 vincular a um objetivo (opcional)</option>
                {objetivos.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.titulo}
                  </option>
                ))}
              </select>

              {objetivoNoForm && objetivoNoForm.tipo === 'valor' && (
                <input
                  type="number"
                  className="input-incremento"
                  placeholder="quanto isso adianta?"
                  value={incrementoObjetivo}
                  onChange={(e) => setIncrementoObjetivo(e.target.value)}
                  min="0"
                  step="any"
                />
              )}
            </div>
          )}

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
            <span>📅 planejar amanhã {sugestao && !mostrarAmanha && '💡'}</span>
            <span className="amanha-contagem">
              {tarefasDeAmanha.length > 0
                ? tarefasDeAmanha.length + (tarefasDeAmanha.length === 1 ? ' tarefa' : ' tarefas')
                : 'nada ainda'}
            </span>
          </button>

          {mostrarAmanha && (
            <div className="amanha-conteudo">
              {/* objetivo grande parado ha dias - convida a dar um passo
                  pequeno, sem cobrar. pula pro formulario ja com o
                  objetivo escolhido, porque o passo em si é pessoal
                  demais pra vir preenchido sozinho (ao contrario do
                  convite de atributo, que é sempre a mesma frase). */}
              {sugestaoObjetivo && (
                <div className="sugestao-espelho">
                  <p className="sugestao-texto">
                    faz {sugestaoObjetivo.dias} dias sem avançar em "
                    {sugestaoObjetivo.objetivo.titulo}" — que tal um passo
                    pequeno pra amanhã?
                  </p>
                  <button
                    type="button"
                    className="botao-add-sugestao"
                    onClick={() => focarEmObjetivo(sugestaoObjetivo.objetivo.id)}
                  >
                    + criar um passo pra isso
                  </button>
                </div>
              )}

              {/* o heroi-espelho agindo: olha o historico e convida pra
                  cuidar do atributo mais esquecido, com um toque so */}
              {sugestao && (
                <div className="sugestao-espelho">
                  <p className="sugestao-texto">
                    {sugestao.dias === Infinity
                      ? 'ainda não teve nada de '
                      : 'faz ' + sugestao.dias + ' dias sem nada de '}
                    {atributos[sugestao.atributo].nome} {atributos[sugestao.atributo].emoji}
                    {' — '}
                    {convites[sugestao.atributo]}
                  </p>
                  <button
                    type="button"
                    className="botao-add-sugestao"
                    onClick={adicionarSugestao}
                    disabled={adicionandoSugestao}
                  >
                    {adicionandoSugestao ? 'adicionando...' : '+ adicionar pra amanhã'}
                  </button>
                </div>
              )}

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

              {/* repetir plano de um dia anterior - o caminho de UM toque
                  é so abrir aqui e apertar "copiar", ja vem tudo marcado */}
              <div className="copiar-dia">
                <div className="copiar-topo">
                  <span>🔁 repetir tarefas de</span>
                  <input
                    type="date"
                    className="input-data"
                    value={diaParaCopiar}
                    max={somarDias(dataDeHoje(), -1)}
                    onChange={(e) => setDiaParaCopiar(e.target.value)}
                  />
                </div>

                {carregandoCopia && <p className="amanha-vazio">carregando...</p>}

                {!carregandoCopia && tarefasParaCopiar.length === 0 && (
                  <p className="amanha-vazio">nada pra repetir desse dia.</p>
                )}

                {!carregandoCopia && tarefasParaCopiar.length > 0 && (
                  <>
                    <ul className="copiar-lista">
                      {tarefasParaCopiar.map((t) => {
                        const cat = categorias.find((c) => c.id === t.categoria)
                        return (
                          <li key={t.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={!!selecionadasParaCopiar[t.id]}
                                onChange={() => alternarSelecaoCopia(t.id)}
                              />
                              {cat ? cat.emoji : ''} {t.titulo}
                            </label>
                          </li>
                        )
                      })}
                    </ul>

                    <button
                      type="button"
                      className="botao-copiar-amanha"
                      onClick={copiarParaAmanha}
                      disabled={copiando}
                    >
                      {copiando ? 'copiando...' : '🔁 copiar pra amanhã'}
                    </button>
                  </>
                )}
              </div>

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

            if (editandoId === t.id) {
              return (
                <li key={t.id} className="tarefa">
                  <form
                    className="form-editar-tarefa"
                    onSubmit={(e) => salvarEdicao(e, t)}
                  >
                    <input
                      type="text"
                      value={tituloEdit}
                      onChange={(e) => setTituloEdit(e.target.value)}
                      maxLength={80}
                      autoFocus
                    />

                    <div className="chips">
                      {categorias.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={
                            categoriaEdit === c.id ? 'chip chip-ativo cor-' + c.id : 'chip'
                          }
                          onClick={() => setCategoriaEdit(c.id)}
                        >
                          {c.emoji} {c.nome}
                        </button>
                      ))}
                    </div>

                    {!t.recorrente && !feita && (
                      <input
                        type="date"
                        className="input-data"
                        value={dataEdit}
                        min={dataDeHoje()}
                        onChange={(e) => setDataEdit(e.target.value)}
                      />
                    )}

                    {!t.recorrente && feita && (
                      <p className="editar-nota">concluída hoje — não dá pra mudar o dia</p>
                    )}

                    {erroEdit && <p className="erro-form">{erroEdit}</p>}

                    <div className="botoes-editar">
                      <button type="submit" disabled={salvandoEdit}>
                        {salvandoEdit ? 'salvando...' : 'salvar'}
                      </button>
                      <button
                        type="button"
                        className="botao-cancelar-nome"
                        onClick={cancelarEdicao}
                      >
                        cancelar
                      </button>
                    </div>
                  </form>
                </li>
              )
            }

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
                  className="botao-editar"
                  onClick={() => comecarEditar(t)}
                  disabled={!!emAndamento[t.id]}
                  aria-label="editar tarefa"
                >
                  ✏️
                </button>

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

      {/* comemoracao quando um objetivo bate o alvo - toque em qualquer
          lugar fecha, sem exigir achar um botao especifico */}
      {celebracao && (
        <div className="celebracao-fundo" onClick={() => setCelebracao(null)}>
          <div className="celebracao-cartao">
            <div className="celebracao-emoji">🎉</div>
            <p className="celebracao-titulo">objetivo concluído!</p>
            <p className="celebracao-nome">{celebracao.titulo}</p>
            <button
              type="button"
              className="celebracao-botao"
              onClick={() => setCelebracao(null)}
            >
              continuar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TelaHoje
