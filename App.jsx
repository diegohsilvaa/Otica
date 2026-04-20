// Substitua este arquivo pelo seu App.jsx ou copie a função abaixo no App.jsx existente

async function handleLogin(emailDigitado) {
  const emailNormalizado = normalizeEmail(emailDigitado)
  if (!emailNormalizado) {
    setErro('Informe o email liberado para acesso.')
    return
  }

  setAuthLoading(true)
  setErro('')

  const { data, error } = await supabase
    .from('empresas')
    .select('codempresa, nome, email_acesso, ativo')

  if (error) {
    setErro(`Não foi possível validar o acesso. ${error.message}`)
    setAuthLoading(false)
    return
  }

  const empresaEncontrada = (data || []).find((empresa) => {
    const ativo = [true, 1, '1', 'S', 's', 'true'].includes(empresa?.ativo)
    if (!ativo) return false

    const emails = String(empresa?.email_acesso || '')
      .split(/[;,\n]+/)
      .map((item) => normalizeEmail(item))
      .filter(Boolean)

    return emails.includes(emailNormalizado)
  })

  if (!empresaEncontrada) {
    setErro('Este email não está liberado para nenhuma ótica cadastrada.')
    setAuthLoading(false)
    return
  }

  localStorage.setItem('otica_empresa', JSON.stringify(empresaEncontrada))
  setEmpresaAtual(empresaEncontrada)
  setForm(emptyForm(hoje, empresaEncontrada.codempresa))
  setAuthLoading(false)
}
