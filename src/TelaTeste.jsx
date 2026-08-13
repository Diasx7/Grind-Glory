import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// telinha só pra testar se salva e le tarefa do banco, feia mesmo, é descartavel
function TelaTeste({ usuario }) {
  const [titulo, setTitulo] = useState('')
  const [tarefas, setTarefas] = useState([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    buscarTarefas()
  }, [])

  async function buscarTarefas() {
    const { data, error } = await supabase
      .from('tarefa')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('id', { ascending: false })

    if (error) {
      console.log('erro ao buscar tarefas', error)
      setCarregando(false)
      return
    }

    setTarefas(data)
    setCarregando(false)
  }

  async function salvarTarefa(e) {
    e.preventDefault()
    if (!titulo) return

    const { error } = await supabase.from('tarefa').insert({
      usuario_id: usuario.id,
      titulo: titulo,
      categoria: 'geral',
      dificuldade: 1,
      recorrente: false,
      feita_hoje: false,
    })

    if (error) {
      alert('erro ao salvar: ' + error.message)
      return
    }

    setTitulo('')
    buscarTarefas() // recarrega a lista pra mostrar a nova tarefa
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <p>
        logado como <b>{usuario.email}</b>{' '}
        <button onClick={sair}>sair</button>
      </p>

      <h2>teste de tarefa (dia 2, descartavel)</h2>

      <form onSubmit={salvarTarefa}>
        <input
          type="text"
          placeholder="titulo da tarefa"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <button type="submit">salvar</button>
      </form>

      <h3>tarefas salvas:</h3>
      {carregando && <p>carregando...</p>}
      {!carregando && tarefas.length === 0 && <p>nenhuma tarefa ainda</p>}

      <ul>
        {tarefas.map((t) => (
          <li key={t.id}>{t.titulo}</li>
        ))}
      </ul>
    </div>
  )
}

export default TelaTeste
