// coisas que a tela Hoje, a tela do Heroi e a tela Semana usam mais de uma

// os 3 atributos. a chave é igual ao nome da coluna la na tabela usuario.
export const atributos = {
  inteligencia: { nome: 'Inteligência', emoji: '🧠' },
  forca: { nome: 'Força', emoji: '💪' },
  agilidade: { nome: 'Agilidade', emoji: '⚡' },
}

// as categorias do jogo. a dificuldade de cada uma tambem vive no trigger
// aplicar_dificuldade() la no banco - mexeu aqui, mexe la tambem.
export const categorias = [
  { id: 'estudo', nome: 'Estudo', emoji: '📘', atributo: 'inteligencia' },
  { id: 'leitura', nome: 'Leitura', emoji: '📖', atributo: 'inteligencia' },
  { id: 'exercicio', nome: 'Exercício', emoji: '💪', atributo: 'forca' },
  { id: 'saude', nome: 'Saúde', emoji: '🌿', atributo: 'forca' },
  { id: 'trabalho', nome: 'Trabalho', emoji: '💼', atributo: 'agilidade' },
  { id: 'organizacao', nome: 'Organização', emoji: '🧹', atributo: 'agilidade' },
]

// quanta energia da pra ganhar num dia. cada tarefa cumprida vale 1.
// 5 porque é o topo do ritmo normal (3 a 5 tarefas por dia): quem joga
// direito nunca esbarra nesse teto, e quem faz 20 tarefas num sabado
// ainda assim so ganha 5 tentativas em vez de 20.
export const tetoDeEnergia = 5

// um convite curto por atributo, pra quando ele ta parado ha dias.
// tem que soar como convite, nunca como cobrança.
export const convites = {
  inteligencia: 'que tal 10 minutos de leitura?',
  forca: 'uma caminhada curta já conta',
  agilidade: 'arrumar uma gaveta já conta',
}

// a cara do heroi segue o atributo mais forte - ele é um espelho, afinal
export function carinhaDoHeroi(perfil) {
  const total = perfil.inteligencia + perfil.forca + perfil.agilidade
  if (total === 0) return '🥚'

  const maior = Math.max(perfil.inteligencia, perfil.forca, perfil.agilidade)
  if (maior === perfil.inteligencia) return '🧙'
  if (maior === perfil.forca) return '🗡️'
  return '🏹'
}

// o hoje no fuso do celular, no formato que o banco espera (2026-08-18).
// NAO usar toISOString aqui: ele converte pra UTC e as tarefas da noite
// pulavam pro dia seguinte.
export function dataDeHoje() {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return agora.getFullYear() + '-' + mes + '-' + dia
}

// soma (ou subtrai, se for negativo) dias numa data 'AAAA-MM-DD'.
// monta a data pelas partes, mesmo motivo do dataDeHoje: new Date(texto)
// direto cai no fuso UTC e o dia pode vir errado.
export function somarDias(dataTexto, quantosDias) {
  const partes = dataTexto.split('-')
  const data = new Date(partes[0], partes[1] - 1, partes[2])
  data.setDate(data.getDate() + quantosDias)

  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return data.getFullYear() + '-' + mes + '-' + dia
}

// "Hoje", "Amanhã" ou o dia da semana curto, pra cabeçalho de dia na Semana
export function nomeDoDia(dataTexto, hojeTexto) {
  if (dataTexto === hojeTexto) return 'Hoje'
  if (dataTexto === somarDias(hojeTexto, 1)) return 'Amanhã'

  const partes = dataTexto.split('-')
  const data = new Date(partes[0], partes[1] - 1, partes[2])
  const nome = data.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '')
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

// quantos dias se passaram desde uma data 'AAAA-MM-DD'.
// monta a data pelas partes pra nao cair no fuso UTC, mesmo motivo do dataDeHoje
export function diasDesde(dataTexto) {
  const partes = dataTexto.split('-')
  const antiga = new Date(partes[0], partes[1] - 1, partes[2])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const umDia = 1000 * 60 * 60 * 24
  return Math.round((hoje - antiga) / umDia)
}

// olha o historico de conclusoes e acha o atributo que ta ha mais tempo sem
// nenhuma - ou que nunca teve nenhuma. so sugere se passou de 2 dias (mesmo
// criterio do "recado" da tela Heroi), senao devolve null (nada pra sugerir).
export function atributoMaisEsquecido(historico) {
  const ultima = {}
  historico.forEach((c) => {
    if (c.atributo && !ultima[c.atributo]) {
      ultima[c.atributo] = c.data
    }
  })

  const chaves = Object.keys(atributos)
  let escolhido = null
  let maiorDias = 2

  chaves.forEach((chave) => {
    const dias = ultima[chave] ? diasDesde(ultima[chave]) : Infinity
    if (dias > maiorDias) {
      maiorDias = dias
      escolhido = chave
    }
  })

  return escolhido ? { atributo: escolhido, dias: maiorDias } : null
}

// olha os objetivos ativos e acha o que ta parado ha mais tempo (sem
// nenhuma tarefa vinculada concluida). o limite é maior que o do atributo
// (4 dias em vez de 2) porque objetivo grande anda mais devagar por
// natureza - "parado ha 3 dias" nao é sinal de nada ainda.
export function objetivoMaisParado(objetivosAtivos) {
  let escolhido = null
  let maiorDias = 4

  objetivosAtivos.forEach((o) => {
    // sem nenhuma atividade ainda, conta a partir de quando foi criado -
    // um objetivo criado ha 1 hora nao esta "abandonado"
    const referencia = o.ultima_atividade || o.criado_em.slice(0, 10)
    const dias = diasDesde(referencia)

    if (dias > maiorDias) {
      maiorDias = dias
      escolhido = o
    }
  })

  return escolhido ? { objetivo: escolhido, dias: maiorDias } : null
}
