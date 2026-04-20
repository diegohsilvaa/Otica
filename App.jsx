import { useState } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [logado, setLogado] = useState(false)

  async function login(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha
    })

    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }

    if (data?.user) setLogado(true)
    setLoading(false)
  }

  async function sair() {
    await supabase.auth.signOut()
    setLogado(false)
    setEmail('')
    setSenha('')
  }

  if (logado) {
    return <div style={{padding:40,fontFamily:'Arial'}}><h1>Login realizado com sucesso</h1><button onClick={sair}>Sair</button></div>
  }

  return (
    <div style={{padding:40,maxWidth:420,fontFamily:'Arial'}}>
      <h1>Ótica Fácil</h1>
      <p>Login profissional</p>
      <form onSubmit={login}>
        <input type="email" placeholder="Seu email" value={email} onChange={(e)=>setEmail(e.target.value)} style={{width:'100%',padding:10,marginBottom:10}} />
        <input type="password" placeholder="Sua senha" value={senha} onChange={(e)=>setSenha(e.target.value)} style={{width:'100%',padding:10,marginBottom:10}} />
        {erro ? <div style={{color:'red',marginBottom:10}}>{erro}</div> : null}
        <button type="submit" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  )
}
