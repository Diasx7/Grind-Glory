import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { atributos } from './jogo'
import './TelaHeroi.css'

// um convite curto por atributo, pra quando ele ta parado ha dias.
// tem que soar como convite, nunca como cobrança.
const convites = {
  inteligencia: 'que tal 10 minutos de leitura?',
  forca: 'uma caminhada curta já conta',
  agilidade: 'arrumar uma gaveta já conta',
}

// o nivel sai do xp na hora de mostrar, entao nunca sai de sincronia.
// cada nivel custa 50 de xp a mais que o anterior.
function calcularNivel(xp) {
  let nivel = 1
  let sobra = xp
  let custo = 100

  while (sobra >= custo) {
    sobra -= custo
    nivel++
    custo += 50
  }

  return { nivel: nivel, dentro: sobra, custo: custo }
}

// quantos dias se passaram desde uma data 'AAAA-MM-DD'.
// monto a data pelas partes pra nao cair no fuso UTC, mesmo motivo do dataDeHoje
function diasDesde(dataTexto) {
  const partes = dataTexto.split('-')
  const antiga = new Date(partes[0], partes[1] - 1, partes[2])

  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const umDia = 1000 * 60 * 60 * 24
  return Math.round((hoje - antiga) / umDia)
}

function TelaHeroi({ usuario }) {
  const [perfil, setPerfil] = useState(null)
  const [ultimaVez, setUltimaVez] = useState({})
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarHeroi()
  }, [])

  async function buscarHeroi() {
    const { data: dadosPerfil } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    // o historico inteiro, so as duas colunas que interessam. ja vem do mais
    // novo pro mais velho, entao a primeira linha de cada atributo é a ultima
    // vez que ele subiu.
    const { data: historico, error } = await supabase
      .from('conclusao')
      .select('atributo, data')
      .eq('usuario_id', usuario.id)
      .order('data', { ascending: false })

    if (error) {
      console.log('erro ao buscar o historico', error)
    }

    const ultima = {}
    if (historico) {
      historico.forEach((c) => {
        if (c.atributo && !ultima[c.atributo]) {
          ultima[c.atributo] = c.data
        }
      })
    }

    setPerfil(dadosPerfil)
    setUltimaVez(ultima)
    setCarregando(false)
  }

  if (carregando || !perfil) {
    return (
      <div className="tela-heroi">
        <p className="heroi-aviso">carregando seu herói...</p>
      </div>
    )
  }

  const chaves = Object.keys(atributos)
  const valores = chaves.map((c) => perfil[c])
  const maior = Math.max(...valores)
  const menor = Math.min(...valores)
  const total = valores.reduce((a, b) => a + b, 0)

  const nivel = calcularNivel(perfil.xp)
  const nome = usuario.email.split('@')[0]

  // a cara do heroi segue o atributo mais forte - ele é um espelho, afinal
  function carinha() {
    if (total === 0) return '🥚'
    if (maior === perfil.inteligencia) return '🧙'
    if (maior === perfil.forca) return '🗡️'
    return '🏹'
  }

  // a frase que nomeia o desequilibrio. constata, nao cobra.
  function fraseDoEspelho() {
    // se o mais esquecido ja tem 60% do mais forte, ta bem distribuido
    if (menor / maior >= 0.6) {
      return 'seus três lados estão andando juntos ✨'
    }

    const forte = atributos[chaves[valores.indexOf(maior)]].nome
    const fraco = atributos[chaves[valores.indexOf(menor)]].nome
    return (
      'seu herói anda bem mais de ' +
      forte +
      ' do que de ' +
      fraco +
      '. nada quebrado, só desigual.'
    )
  }

  // o recado embaixo de cada barra. "chamando" é quando ta parado ha dias
  // e vale um empurraozinho.
  function recado(chave) {
    const data = ultimaVez[chave]

    if (!data) {
      return { texto: 'ainda não teve nada por aqui — ' + convites[chave], chamando: false }
    }

    const dias = diasDesde(data)

    if (dias <= 0) return { texto: 'você cuidou disso hoje ✨', chamando: false }
    if (dias === 1) return { texto: 'você cuidou disso ontem', chamando: false }
    if (dias === 2) return { texto: 'faz 2 dias', chamando: false }

    return {
      texto:
        'faz ' +
        dias +
        ' dias sem nada de ' +
        atributos[chave].nome +
        ' ' +
        atributos[chave].emoji +
        ' — ' +
        convites[chave],
      chamando: true,
    }
  }

  return (
    <div className="tela-heroi">
      <div className="brilho-heroi"></div>

      <div className="conteudo-heroi">
        <div className="cartao-heroi">
          <div className="heroi-carinha">{carinha()}</div>
          <p className="heroi-nome">{nome}</p>
          <p className="heroi-nivel">Nível {nivel.nivel}</p>

          <div className="barra-nivel">
            <div
              className="barra-nivel-cheia"
              style={{ width: (nivel.dentro / nivel.custo) * 100 + '%' }}
            ></div>
          </div>
          <p className="heroi-xp">
            {nivel.dentro} / {nivel.custo} XP pro nível {nivel.nivel + 1}
          </p>

          <div className="heroi-bolsos">
            <span>🪙 {perfil.moedas} moedas</span>
            <span>⭐ {perfil.xp} XP no total</span>
          </div>
        </div>

        <h2 className="titulo-espelho">seu espelho</h2>

        {total === 0 ? (
          <div className="heroi-vazio">
            <p className="heroi-vazio-titulo">
              seu herói ainda é uma folha em branco 🌱
            </p>
            <p className="heroi-vazio-texto">
              marca a primeira tarefa lá na aba Hoje e ele começa a tomar forma.
              o que você faz na vida real é o que ele vira aqui.
            </p>
          </div>
        ) : (
          <p className="frase-espelho">{fraseDoEspelho()}</p>
        )}

        <div className="lista-atributos">
          {chaves.map((chave) => {
            const valor = perfil[chave]
            // a barra é relativa ao atributo mais alto: assim o que ta pra tras
            // fica curto de verdade e da pra ver o desequilibrio de longe
            const largura = maior === 0 ? 0 : (valor / maior) * 100
            const r = recado(chave)

            return (
              <div key={chave} className="atributo-bloco">
                <div className="atributo-topo">
                  <span className="atributo-nome">
                    {atributos[chave].emoji} {atributos[chave].nome}
                  </span>
                  <span className="atributo-valor">{valor}</span>
                </div>

                <div className="barra-fundo">
                  <div
                    className={'barra-cheia barra-' + chave}
                    style={{ width: largura + '%' }}
                  ></div>
                </div>

                <p
                  className={
                    r.chamando ? 'atributo-recado recado-chamando' : 'atributo-recado'
                  }
                >
                  {r.texto}
                </p>
              </div>
            )
          })}
        </div>

        <footer className="rodape-heroi">dia 6 · tela do herói</footer>
      </div>
    </div>
  )
}

export default TelaHeroi
