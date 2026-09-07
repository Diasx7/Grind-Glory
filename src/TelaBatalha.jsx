import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabaseClient'
import { carinhaDoHeroi, tetoDeEnergia } from './jogo'
import './TelaBatalha.css'

// os monstros vao se repetindo em ciclo conforme a fase sobe, so que
// cada vez mais fortes. o numeral romano marca em que volta a gente ta.
const monstrosBase = [
  { nome: 'Slime Preguiçoso', emoji: '🟢' },
  { nome: 'Rato de Esgoto', emoji: '🐀' },
  { nome: 'Morcego Sonolento', emoji: '🦇' },
  { nome: 'Aranha Gigante', emoji: '🕷️' },
  { nome: 'Lobo Faminto', emoji: '🐺' },
  { nome: 'Esqueleto Rangedor', emoji: '💀' },
  { nome: 'Golem de Pedra', emoji: '🗿' },
  { nome: 'Serpente Sombria', emoji: '🐍' },
  { nome: 'Espectro', emoji: '👻' },
  { nome: 'Dragão Jovem', emoji: '🐉' },
]

const romanos = ['', ' II', ' III', ' IV', ' V', ' VI']

// os numeros do heroi saem SO dos 3 atributos. cada um tem um trabalho:
// força bate, inteligencia acerta o golpe crítico, agilidade desvia.
// assim da pra olhar a luta e entender qual lado da vida real ta faltando.
function statusDoHeroi(perfil) {
  const soma = perfil.inteligencia + perfil.forca + perfil.agilidade

  return {
    vida: 60 + soma * 2,
    ataque: 5 + perfil.forca * 2,
    // com teto, senao um heroi muito velho vira invencivel e a luta perde a graça
    critico: Math.min(50, perfil.inteligencia),
    esquiva: Math.min(40, perfil.agilidade),
  }
}

function monstroDaFase(fase) {
  const base = monstrosBase[(fase - 1) % monstrosBase.length]
  const volta = Math.floor((fase - 1) / monstrosBase.length)

  return {
    nome: base.nome + romanos[Math.min(volta, romanos.length - 1)],
    emoji: base.emoji,
    vida: 30 + fase * 18,
    ataque: Math.round(4 + fase * 2.5),
  }
}

// sorteia se algo de X por cento aconteceu
function sorteou(porcentagem) {
  return Math.random() * 100 < porcentagem
}

// roda a luta inteira de uma vez e devolve a lista de turnos.
// a tela depois vai mostrando turno por turno pra parecer que ta acontecendo.
function lutar(heroi, monstro) {
  const turnos = []
  let vidaHeroi = heroi.vida
  let vidaMonstro = monstro.vida
  let rodada = 0

  // o teto de 40 é so uma trava de seguranca pra nunca virar loop infinito
  while (vidaHeroi > 0 && vidaMonstro > 0 && rodada < 40) {
    rodada++

    // o heroi bate primeiro
    const critico = sorteou(heroi.critico)
    const dano = critico ? heroi.ataque * 2 : heroi.ataque
    vidaMonstro = Math.max(0, vidaMonstro - dano)

    turnos.push({
      quem: 'heroi',
      texto: critico
        ? '🧠 golpe crítico! ' + dano + ' de dano'
        : '⚔️ você acerta ' + dano + ' de dano',
      vidaHeroi: vidaHeroi,
      vidaMonstro: vidaMonstro,
    })

    if (vidaMonstro === 0) break

    // agora o monstro revida
    if (sorteou(heroi.esquiva)) {
      turnos.push({
        quem: 'esquiva',
        texto: '⚡ você desvia do ataque',
        vidaHeroi: vidaHeroi,
        vidaMonstro: vidaMonstro,
      })
    } else {
      vidaHeroi = Math.max(0, vidaHeroi - monstro.ataque)
      turnos.push({
        quem: 'monstro',
        texto: '💥 o monstro acerta ' + monstro.ataque + ' de dano',
        vidaHeroi: vidaHeroi,
        vidaMonstro: vidaMonstro,
      })
    }
  }

  return { turnos: turnos, venceu: vidaMonstro === 0 }
}

function TelaBatalha({ usuario }) {
  const [perfil, setPerfil] = useState(null)
  const [fase, setFase] = useState(1)
  const [carregando, setCarregando] = useState(true)
  const [turnosNaTela, setTurnosNaTela] = useState([])
  const [lutando, setLutando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const cronometro = useRef(null)

  useEffect(() => {
    buscarPerfil()

    // se sair da aba no meio da luta, para o cronometro
    return () => clearInterval(cronometro.current)
  }, [])

  async function buscarPerfil() {
    const { data } = await supabase
      .from('usuario')
      .select('*')
      .eq('id', usuario.id)
      .maybeSingle()

    if (data) {
      setPerfil(data)
      setFase(data.fase)
    }
    setCarregando(false)
  }

  async function subirDeFase(nova) {
    setFase(nova)

    const { error } = await supabase
      .from('usuario')
      .update({ fase: nova })
      .eq('id', usuario.id)

    if (error) {
      console.log('erro ao salvar a fase', error)
    }
  }

  // tentar a fase custa 1 de energia, e energia so vem de tarefa cumprida.
  // é isso que impede o jogo de andar sozinho.
  async function gastarEnergia() {
    const nova = perfil.energia - 1
    setPerfil({ ...perfil, energia: nova })

    const { error } = await supabase
      .from('usuario')
      .update({ energia: nova })
      .eq('id', usuario.id)

    if (error) {
      console.log('erro ao gastar energia', error)
    }
  }

  function comecarLuta() {
    if (perfil.energia <= 0) return

    gastarEnergia()

    const heroi = statusDoHeroi(perfil)
    const monstro = monstroDaFase(fase)
    const luta = lutar(heroi, monstro)

    setTurnosNaTela([])
    setResultado(null)
    setLutando(true)

    // mostra um turno a cada meio segundo, ate acabar a lista
    let i = 0
    cronometro.current = setInterval(() => {
      if (i < luta.turnos.length) {
        setTurnosNaTela(luta.turnos.slice(0, i + 1))
        i++
        return
      }

      clearInterval(cronometro.current)
      setLutando(false)
      setResultado(luta.venceu ? 'vitoria' : 'derrota')

      // perder nao mexe em NADA no banco: sem perder fase, moeda ou atributo
      if (luta.venceu) {
        subirDeFase(fase + 1)
      }
    }, 500)
  }

  if (carregando || !perfil) {
    return (
      <div className="tela-batalha">
        <p className="batalha-aviso">preparando a arena...</p>
      </div>
    )
  }

  const heroi = statusDoHeroi(perfil)
  const monstro = monstroDaFase(fase)

  // o ultimo turno mostrado é quem manda nas barras de vida
  const ultimo = turnosNaTela[turnosNaTela.length - 1]
  const vidaHeroiAgora = ultimo ? ultimo.vidaHeroi : heroi.vida
  const vidaMonstroAgora = ultimo ? ultimo.vidaMonstro : monstro.vida

  return (
    <div className="tela-batalha">
      <div className="brilho-batalha"></div>

      <div className="conteudo-batalha">
        <p className="fase-atual">FASE {fase}</p>

        <div className="arena">
          <div className="lutador">
            <div className="lutador-carinha">{carinhaDoHeroi(perfil)}</div>
            <p className="lutador-nome">você</p>
            <div className="barra-vida">
              <div
                className="barra-vida-cheia vida-heroi"
                style={{ width: (vidaHeroiAgora / heroi.vida) * 100 + '%' }}
              ></div>
            </div>
            <p className="lutador-vida">
              {vidaHeroiAgora} / {heroi.vida}
            </p>
          </div>

          <span className="versus">×</span>

          <div className="lutador">
            <div className="lutador-carinha">{monstro.emoji}</div>
            <p className="lutador-nome">{monstro.nome}</p>
            <div className="barra-vida">
              <div
                className="barra-vida-cheia vida-monstro"
                style={{ width: (vidaMonstroAgora / monstro.vida) * 100 + '%' }}
              ></div>
            </div>
            <p className="lutador-vida">
              {vidaMonstroAgora} / {monstro.vida}
            </p>
          </div>
        </div>

        {/* deixa explicito que cada numero da luta veio de um atributo,
            que veio de uma tarefa que a pessoa fez na vida real */}
        <div className="poderes">
          <div className="poder">
            <span>💪 Força {perfil.forca}</span>
            <b>{heroi.ataque} de ataque</b>
          </div>
          <div className="poder">
            <span>🧠 Inteligência {perfil.inteligencia}</span>
            <b>{heroi.critico}% de crítico</b>
          </div>
          <div className="poder">
            <span>⚡ Agilidade {perfil.agilidade}</span>
            <b>{heroi.esquiva}% de esquiva</b>
          </div>
        </div>

        <div className="energia-linha">
          <span>🔋 energia</span>
          <b>
            {perfil.energia} / {tetoDeEnergia}
          </b>
        </div>

        <button
          className="botao-lutar"
          onClick={comecarLuta}
          disabled={lutando || perfil.energia <= 0}
        >
          {lutando ? 'lutando...' : resultado ? 'lutar de novo' : 'lutar'}
        </button>

        {/* sem energia nao é castigo: é so o jogo lembrando de onde ele
            tira gasolina. por isso o tom é convite. */}
        {perfil.energia <= 0 && (
          <p className="sem-energia">
            cumpre alguma coisa hoje e teu herói ganha fôlego pra tentar 🌱
          </p>
        )}

        {resultado === 'vitoria' && (
          <div className="resultado resultado-vitoria">
            <p className="resultado-titulo">🎉 você venceu!</p>
            <p className="resultado-texto">
              a fase {fase} te espera agora. seu herói ficou mais forte porque
              você fez as coisas de verdade.
            </p>
          </div>
        )}

        {resultado === 'derrota' && (
          <div className="resultado resultado-derrota">
            <p className="resultado-titulo">seu herói ainda não dá conta desse aqui</p>
            <p className="resultado-texto">
              não perdeu nada: nem fase, nem moeda, nem atributo. mais uns dias
              de vida real e ele chega lá 🌱
            </p>
          </div>
        )}

        {turnosNaTela.length > 0 && (
          <div className="turnos">
            {turnosNaTela.map((t, i) => (
              <p key={i} className={'turno turno-' + t.quem}>
                {t.texto}
              </p>
            ))}
          </div>
        )}

        <footer className="rodape-batalha">dia 8 · batalha</footer>
      </div>
    </div>
  )
}

export default TelaBatalha
