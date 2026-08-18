// coisas que a tela Hoje e a tela do Heroi usam as duas

// os 3 atributos. a chave é igual ao nome da coluna la na tabela usuario.
export const atributos = {
  inteligencia: { nome: 'Inteligência', emoji: '🧠' },
  forca: { nome: 'Força', emoji: '💪' },
  agilidade: { nome: 'Agilidade', emoji: '⚡' },
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
