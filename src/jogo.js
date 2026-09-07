// coisas que a tela Hoje e a tela do Heroi usam as duas

// os 3 atributos. a chave é igual ao nome da coluna la na tabela usuario.
export const atributos = {
  inteligencia: { nome: 'Inteligência', emoji: '🧠' },
  forca: { nome: 'Força', emoji: '💪' },
  agilidade: { nome: 'Agilidade', emoji: '⚡' },
}

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
