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
