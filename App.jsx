import { useMemo, useState } from 'react'
import { supabase } from './supabase'

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function emptyProduto() {
  return {
    id: null,
    codigo: '',
    descricao: '',
    marca: '',
    modelo: '',
    cor: '',
    material: '',
    genero: 'Unissex',
    classificacao: 'receituario',
    referencia_fornecedor: '',
    preco_custo: '',
    preco_venda: '',
    foto_url: '',
    observacao: '',
    ativo: true,
    estoque_facil: '',
    estoque_plena: ''
  }
}

export default function ProdutosSection({
  produtos,
  empresaAtual,
  setErro,
  refreshProdutos
}) {
  const [buscaProduto, setBuscaProduto] = useState('')
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [produtoForm, setProdutoForm] = useState(emptyProduto())
  const [salvandoProduto, setSalvandoProduto] = useState(false)

  const produtosFiltrados = useMemo(() => {
    const termo = buscaProduto.toLowerCase().trim()
    return (produtos || []).filter((item) =>
      `${item.codigo || ''} ${item.descricao || ''} ${item.marca || ''} ${item.modelo || ''} ${item.classificacao || ''}`.toLowerCase().includes(termo)
    )
  }, [produtos, buscaProduto])

  function updateProdutoField(field, value) {
    setProdutoForm((prev) => ({ ...prev, [field]: value }))
  }

  function novoProduto() {
    setProdutoForm(emptyProduto())
    setShowProdutoModal(true)
  }

  function editarProduto(produto) {
    setProdutoForm({
      id: produto.id,
      codigo: produto.codigo || '',
      descricao: produto.descricao || '',
      marca: produto.marca || '',
      modelo: produto.modelo || '',
      cor: produto.cor || '',
      material: produto.material || '',
      genero: produto.genero || 'Unissex',
      classificacao: produto.classificacao || 'receituario',
      referencia_fornecedor: produto.referencia_fornecedor || '',
      preco_custo: String(produto.preco_custo ?? ''),
      preco_venda: String(produto.preco_venda ?? ''),
      foto_url: produto.foto_url || '',
      observacao: produto.observacao || '',
      ativo: produto.ativo ?? true,
      estoque_facil: String(produto.estoque_facil ?? ''),
      estoque_plena: String(produto.estoque_plena ?? '')
    })
    setShowProdutoModal(true)
  }

  async function salvarProduto(e) {
    e?.preventDefault?.()
    setErro('')
    setSalvandoProduto(true)

    if (!produtoForm.descricao.trim()) {
      setErro('Informe a descrição da armação.')
      setSalvandoProduto(false)
      return
    }

    const payload = {
      descricao: produtoForm.descricao.trim(),
      marca: produtoForm.marca.trim(),
      modelo: produtoForm.modelo.trim(),
      cor: produtoForm.cor.trim(),
      material: produtoForm.material.trim(),
      genero: produtoForm.genero.trim(),
      classificacao: produtoForm.classificacao,
      referencia_fornecedor: produtoForm.referencia_fornecedor.trim(),
      preco_custo: Number(String(produtoForm.preco_custo || '0').replace(',', '.')) || 0,
      preco_venda: Number(String(produtoForm.preco_venda || '0').replace(',', '.')) || 0,
      foto_url: produtoForm.foto_url.trim(),
      observacao: produtoForm.observacao.trim(),
      ativo: !!produtoForm.ativo
    }

    let produtoId = produtoForm.id

    if (produtoForm.id) {
      const { error } = await supabase.from('produtos').update(payload).eq('id', produtoForm.id)
      if (error) {
        setErro(`Não foi possível salvar o produto. ${error.message}`)
        setSalvandoProduto(false)
        return
      }
    } else {
      const { data, error } = await supabase.from('produtos').insert([payload]).select('*').maybeSingle()
      if (error) {
        setErro(`Não foi possível salvar o produto. ${error.message}`)
        setSalvandoProduto(false)
        return
      }
      produtoId = data?.id
    }

    const estoqueFacil = parseInt(String(produtoForm.estoque_facil || '0'), 10) || 0
    const estoquePlena = parseInt(String(produtoForm.estoque_plena || '0'), 10) || 0

    const { error: estoqueError } = await supabase
      .from('estoque_produtos_empresa')
      .upsert([
        { produto_id: produtoId, codempresa: 1, quantidade: estoqueFacil },
        { produto_id: produtoId, codempresa: 2, quantidade: estoquePlena }
      ], { onConflict: 'produto_id,codempresa' })

    if (estoqueError) {
      setErro(`Produto salvo, mas não foi possível ajustar o estoque. ${estoqueError.message}`)
      setSalvandoProduto(false)
      return
    }

    setProdutoForm(emptyProduto())
    setShowProdutoModal(false)
    setSalvandoProduto(false)
    await refreshProdutos()
  }

  return (
    <>
      <section className="stats-grid client-stats-grid">
        <div className="stat-card">
          <span className="small-label neutral">Produtos cadastrados</span>
          <strong>{produtos?.length || 0}</strong>
        </div>
        <div className="stat-card">
          <span className="small-label neutral">Receituário</span>
          <strong>{(produtos || []).filter((item) => item.classificacao === 'receituario').length}</strong>
        </div>
        <div className="stat-card">
          <span className="small-label neutral">Solar</span>
          <strong>{(produtos || []).filter((item) => item.classificacao === 'solar').length}</strong>
        </div>
        <div className="stat-card accent orange-accent">
          <span className="small-label light">Estoque da empresa atual</span>
          <strong>
            {empresaAtual?.codempresa === 1
              ? (produtos || []).reduce((acc, item) => acc + Number(item.estoque_facil || 0), 0)
              : (produtos || []).reduce((acc, item) => acc + Number(item.estoque_plena || 0), 0)}
          </strong>
          <p>{empresaAtual?.nome || 'Ótica'}</p>
        </div>
      </section>

      <section className="panel clientes-panel">
        <div className="panel-head clientes-head">
          <div>
            <h3>Armações cadastradas</h3>
            <p>Cadastro único de produtos com estoque separado por empresa.</p>
          </div>
          <div className="filters clientes-filters">
            <input
              placeholder="Buscar por código, descrição, marca, modelo ou tipo"
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
            />
            <button type="button" className="primary-inline-btn" onClick={novoProduto}>
              Novo produto
            </button>
          </div>
        </div>

        <div className="clientes-list">
          {produtosFiltrados.length === 0 ? (
            <div className="empty-state">Nenhuma armação cadastrada.</div>
          ) : produtosFiltrados.map((produto) => (
            <button
              type="button"
              className="cliente-row"
              key={produto.id}
              onClick={() => editarProduto(produto)}
            >
              <div className="cliente-main">
                <strong>{produto.descricao || 'Sem descrição'}</strong>
                <span>
                  {produto.codigo || 'Automático'} • {produto.marca || '-'} • {produto.modelo || '-'} • {produto.classificacao === 'solar' ? 'Solar' : 'Receituário'}
                </span>
              </div>
              <div className="cliente-side">
                <b>{formatMoney(produto.preco_venda)}</b>
                <span>Fácil {produto.estoque_facil || 0} • Plena {produto.estoque_plena || 0}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {showProdutoModal ? (
        <div className="modal-overlay">
          <div className="modal-card client-modal-card">
            <div className="modal-head">
              <div>
                <p className="page-kicker orange-text">Cadastro de produto</p>
                <h3>{produtoForm.id ? 'Editar armação' : 'Nova armação'}</h3>
                <p className="dark-text">Código automático, foto do produto e estoque por empresa.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowProdutoModal(false)}>×</button>
            </div>

            <form onSubmit={salvarProduto} className="client-scroll-area">
              <div className="form-grid">
                <label className="field">
                  <span>Código</span>
                  <input value={produtoForm.codigo || ''} disabled placeholder="Gerado automaticamente" />
                </label>

                <label className="field">
                  <span>Tipo</span>
                  <select value={produtoForm.classificacao} onChange={(e) => updateProdutoField('classificacao', e.target.value)}>
                    <option value="receituario">Receituário</option>
                    <option value="solar">Solar</option>
                  </select>
                </label>

                <label className="field field-full">
                  <span>Descrição da armação</span>
                  <input value={produtoForm.descricao} onChange={(e) => updateProdutoField('descricao', e.target.value)} />
                </label>

                <label className="field"><span>Marca</span><input value={produtoForm.marca} onChange={(e) => updateProdutoField('marca', e.target.value)} /></label>
                <label className="field"><span>Modelo</span><input value={produtoForm.modelo} onChange={(e) => updateProdutoField('modelo', e.target.value)} /></label>
                <label className="field"><span>Cor</span><input value={produtoForm.cor} onChange={(e) => updateProdutoField('cor', e.target.value)} /></label>
                <label className="field"><span>Material</span><input value={produtoForm.material} onChange={(e) => updateProdutoField('material', e.target.value)} /></label>

                <label className="field">
                  <span>Gênero</span>
                  <select value={produtoForm.genero} onChange={(e) => updateProdutoField('genero', e.target.value)}>
                    <option>Unissex</option>
                    <option>Masculino</option>
                    <option>Feminino</option>
                    <option>Infantil</option>
                  </select>
                </label>

                <label className="field"><span>Referência do fornecedor</span><input value={produtoForm.referencia_fornecedor} onChange={(e) => updateProdutoField('referencia_fornecedor', e.target.value)} /></label>
                <label className="field"><span>Preço de custo</span><input value={produtoForm.preco_custo} onChange={(e) => updateProdutoField('preco_custo', e.target.value)} /></label>
                <label className="field"><span>Preço de venda</span><input value={produtoForm.preco_venda} onChange={(e) => updateProdutoField('preco_venda', e.target.value)} /></label>

                <label className="field field-full">
                  <span>Foto do produto (URL)</span>
                  <input value={produtoForm.foto_url} onChange={(e) => updateProdutoField('foto_url', e.target.value)} placeholder="https://..." />
                </label>

                {produtoForm.foto_url ? (
                  <div className="field field-full">
                    <span>Prévia da foto</span>
                    <img src={produtoForm.foto_url} alt={produtoForm.descricao || 'Produto'} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 18, border: '1px solid #e5ebf3' }} />
                  </div>
                ) : null}

                <label className="field"><span>Estoque Fácil</span><input value={produtoForm.estoque_facil} onChange={(e) => updateProdutoField('estoque_facil', e.target.value)} /></label>
                <label className="field"><span>Estoque Plena</span><input value={produtoForm.estoque_plena} onChange={(e) => updateProdutoField('estoque_plena', e.target.value)} /></label>

                <label className="field field-full">
                  <span>Observação</span>
                  <textarea rows="4" value={produtoForm.observacao} onChange={(e) => updateProdutoField('observacao', e.target.value)} />
                </label>
              </div>

              <div className="modal-actions sticky-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowProdutoModal(false)}>Fechar</button>
                <button type="submit" className="primary-inline-btn" disabled={salvandoProduto}>
                  {salvandoProduto ? 'Salvando...' : 'Salvar produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}
