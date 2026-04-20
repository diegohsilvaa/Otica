import { useEffect, useState } from 'react'
import { supabase } from './supabase'

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

export default function App() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    const salvo = localStorage.getItem('otica_usuario')
    if (!salvo) return
    try {
      const parsed = JSON.parse(salvo)
      if (parsed?.email && parsed?.codempresa) {
        setUsuario(parsed)
      }
    } catch {}
  }, [])

  async function login(e) {
    e.preventDefault()
    setErro('')

    const loginEmail = normalizeEmail(email)
    if (!loginEmail || !senha) {
      setErro('Informe email e senha.')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.rpc('autenticar_usuario', {
      login_email: loginEmail,
      login_senha: senha
    })

    if (error) {
      setErro(`Não foi possível entrar. ${error.message}`)
      setLoading(false)
      return
    }

    const user = Array.isArray(data) ? data[0] : data

    if (!user) {
      setErro('Email ou senha inválidos, ou usuário inativo.')
      setLoading(false)
      return
    }

    localStorage.setItem('otica_usuario', JSON.stringify(user))
    setUsuario(user)
    setLoading(false)
  }

  function sair() {
    localStorage.removeItem('otica_usuario')
    setUsuario(null)
    setEmail('')
    setSenha('')
    setErro('')
  }

  if (usuario) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#eef3f8',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Arial, sans-serif',
        padding: 24
      }}>
        <div style={{
          width: 520,
          background: '#fff',
          borderRadius: 18,
          padding: 32,
          boxShadow: '0 16px 40px rgba(0,0,0,.08)'
        }}>
          <p style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: '#d96f00', fontWeight: 700, marginBottom: 8 }}>
            ACESSO LIBERADO
          </p>
          <h1 style={{ marginTop: 0, color: '#162034' }}>Bem-vindo</h1>
          <p><strong>Nome:</strong> {usuario.nome || '-'}</p>
          <p><strong>Email:</strong> {usuario.email}</p>
          <p><strong>Empresa:</strong> {usuario.empresa_nome} (cód. {usuario.codempresa})</p>
          <p><strong>Perfil:</strong> {usuario.perfil || 'usuario'}</p>

          <button
            onClick={sair}
            style={{
              marginTop: 16,
              border: 0,
              borderRadius: 12,
              padding: '12px 16px',
              background: 'linear-gradient(90deg,#d96f00,#ffb347)',
              color: '#161616',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Sair
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: '1.15fr .85fr',
      gap: 18,
      padding: 28,
      background: 'linear-gradient(180deg,#eef3f8,#e8edf4)',
      fontFamily: 'Arial, sans-serif'
    }}>
      <section style={{
        borderRadius: 24,
        boxShadow: '0 16px 40px rgba(0,0,0,.08)',
        background: 'linear-gradient(135deg,#050505,#20242d)',
        color: '#fff',
        padding: 42,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: 420
      }}>
        <p style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 700, color: '#ffb347' }}>
          ACESSO EMPRESARIAL
        </p>
        <h1 style={{ fontSize: 48, lineHeight: 1.05, margin: '10px 0 18px', maxWidth: 580 }}>
          Login pela tabela de usuários
        </h1>
        <p style={{ maxWidth: 520, fontSize: 18, lineHeight: 1.7, color: 'rgba(255,255,255,.82)' }}>
          Você cadastra email e senha na tabela <strong>usuarios</strong>. O sistema valida no banco e libera a empresa vinculada.
        </p>
      </section>

      <form
        onSubmit={login}
        style={{
          borderRadius: 24,
          boxShadow: '0 16px 40px rgba(0,0,0,.08)',
          background: '#fff',
          padding: '34px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <p style={{ textTransform: 'uppercase', letterSpacing: '.12em', fontSize: 11, fontWeight: 700, color: '#7b879f', marginBottom: 8 }}>
          LOGIN
        </p>
        <h2 style={{ marginTop: 0, marginBottom: 8 }}>Acesse sua ótica</h2>
        <p style={{ color: '#1e293b', marginTop: 0, marginBottom: 22 }}>
          Informe o email e a senha cadastrados na tabela de usuários.
        </p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@otica.com.br"
            autoComplete="username"
            style={{
              width: '100%',
              padding: '13px 14px',
              border: '1px solid #dbe3ef',
              borderRadius: 16,
              background: '#f8fbff',
              color: '#0f172a'
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>Senha</span>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            style={{
              width: '100%',
              padding: '13px 14px',
              border: '1px solid #dbe3ef',
              borderRadius: 16,
              background: '#f8fbff',
              color: '#0f172a'
            }}
          />
        </label>

        {erro ? (
          <div style={{
            marginBottom: 18,
            background: '#fff2f2',
            border: '1px solid #ffd2d2',
            color: '#c53030',
            borderRadius: 14,
            padding: '12px 14px'
          }}>
            {erro}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 16,
            padding: '12px 16px',
            fontWeight: 700,
            cursor: 'pointer',
            background: 'linear-gradient(90deg,#d96f00,#ffb347)',
            color: '#161616'
          }}
        >
          {loading ? 'Entrando...' : 'Entrar no sistema'}
        </button>
      </form>
    </div>
  )
}
