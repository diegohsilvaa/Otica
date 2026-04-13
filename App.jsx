import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'oticas-facil-livro-caixa';

const categoriasPadrao = [
  'Venda',
  'Serviço',
  'Fornecedor',
  'Despesa fixa',
  'Aluguel',
  'Energia',
  'Internet',
  'Funcionário',
  'Outros',
];

const formasPadrao = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Débito', 'Crédito'];

const dadosIniciais = [
  {
    id: 1,
    data: '2026-04-12',
    descricao: 'Venda de armação + lentes',
    categoria: 'Venda',
    tipo: 'Entrada',
    forma: 'Pix',
    valor: 780,
    observacao: 'Pagamento à vista',
    criadoEm: '2026-04-12T10:00:00',
  },
  {
    id: 2,
    data: '2026-04-12',
    descricao: 'Pagamento fornecedor de lentes',
    categoria: 'Fornecedor',
    tipo: 'Saída',
    forma: 'Transferência',
    valor: 320,
    observacao: 'Reposição de estoque',
    criadoEm: '2026-04-12T11:00:00',
  },
];

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const [ano, mes, dia] = value.split('-');
  return `${dia}/${mes}/${ano}`;
}

function normalizeMoneyInput(value) {
  return value.replace(/[^\d,.-]/g, '').replace(',', '.');
}

function getInitialLancamentos() {
  if (typeof window === 'undefined') return dadosIniciais;
  try {
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    if (!salvo) return dadosIniciais;
    const parsed = JSON.parse(salvo);
    return Array.isArray(parsed) && parsed.length ? parsed : dadosIniciais;
  } catch {
    return dadosIniciais;
  }
}

function getEmptyForm() {
  const hoje = new Date().toISOString().slice(0, 10);
  return {
    data: hoje,
    descricao: '',
    tipo: 'Entrada',
    categoria: 'Venda',
    forma: 'Pix',
    valor: '',
    observacao: '',
  };
}

export default function OticasFacilLivroCaixa() {
  const [lancamentos, setLancamentos] = useState(getInitialLancamentos);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [form, setForm] = useState(getEmptyForm());
  const [editandoId, setEditandoId] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos));
  }, [lancamentos]);

  const lancamentosFiltrados = useMemo(() => {
    return [...lancamentos]
      .filter((item) => {
        const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao || ''}`.toLowerCase();
        const buscaOk = texto.includes(busca.toLowerCase());
        const tipoOk = filtroTipo === 'Todos' || item.tipo === filtroTipo;
        const inicioOk = !filtroDataInicio || item.data >= filtroDataInicio;
        const fimOk = !filtroDataFim || item.data <= filtroDataFim;
        return buscaOk && tipoOk && inicioOk && fimOk;
      })
      .sort((a, b) => {
        if (a.data === b.data) {
          return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
        }
        return a.data < b.data ? 1 : -1;
      });
  }, [lancamentos, busca, filtroTipo, filtroDataInicio, filtroDataFim]);

  const totalEntradas = useMemo(
    () => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0),
    [lancamentos]
  );

  const totalSaidas = useMemo(
    () => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0),
    [lancamentos]
  );

  const saldoAtual = totalEntradas - totalSaidas;

  function limparFormulario() {
    setForm(getEmptyForm());
    setEditandoId(null);
    setErro('');
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    const valorNumerico = Number(normalizeMoneyInput(form.valor));

    if (!form.data || !form.descricao.trim() || !form.categoria || !form.tipo || !form.forma) {
      setErro('Preencha os campos obrigatórios.');
      return;
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor válido maior que zero.');
      return;
    }

    if (editandoId) {
      setLancamentos((prev) =>
        prev.map((item) =>
          item.id === editandoId
            ? {
                ...item,
                ...form,
                descricao: form.descricao.trim(),
                observacao: form.observacao.trim(),
                valor: valorNumerico,
              }
            : item
        )
      );
    } else {
      setLancamentos((prev) => [
        {
          id: Date.now(),
          ...form,
          descricao: form.descricao.trim(),
          observacao: form.observacao.trim(),
          valor: valorNumerico,
          criadoEm: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    limparFormulario();
  }

  function handleEdit(item) {
    setForm({
      data: item.data,
      descricao: item.descricao,
      tipo: item.tipo,
      categoria: item.categoria,
      forma: item.forma,
      valor: String(item.valor),
      observacao: item.observacao || '',
    });
    setEditandoId(item.id);
    setErro('');
  }

  function handleDelete(id) {
    const confirmar = window.confirm('Deseja excluir este lançamento?');
    if (!confirmar) return;
    setLancamentos((prev) => prev.filter((item) => item.id !== id));
    if (editandoId === id) limparFormulario();
  }

  function handleResetAll() {
    const confirmar = window.confirm('Isso vai apagar todos os lançamentos salvos neste navegador. Deseja continuar?');
    if (!confirmar) return;
    setLancamentos([]);
    limparFormulario();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Sistema interno</p>
            <h1 className="text-2xl font-bold tracking-tight">Óticas Fácil</h1>
            <p className="mt-1 text-sm text-slate-500">Livro caixa com salvamento local no navegador.</p>
          </div>

          <div className="flex gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 shadow-sm">
              <p className="text-xs text-slate-500">Módulo atual</p>
              <p className="text-sm font-semibold">Livro Caixa</p>
            </div>
            <button
              onClick={handleResetAll}
              className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition hover:bg-rose-50"
            >
              Limpar tudo
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Entradas</p>
            <h2 className="mt-2 text-3xl font-bold">{formatMoney(totalEntradas)}</h2>
            <p className="mt-2 text-sm text-slate-500">Soma de todos os lançamentos de entrada.</p>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Saídas</p>
            <h2 className="mt-2 text-3xl font-bold">{formatMoney(totalSaidas)}</h2>
            <p className="mt-2 text-sm text-slate-500">Soma de todos os lançamentos de saída.</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5 text-white shadow-sm">
            <p className="text-sm text-slate-300">Saldo atual</p>
            <h2 className="mt-2 text-3xl font-bold">{formatMoney(saldoAtual)}</h2>
            <p className="mt-2 text-sm text-slate-300">Entradas menos saídas.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_1.95fr]">
          <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">{editandoId ? 'Editar lançamento' : 'Novo lançamento'}</h3>
                <p className="mt-1 text-sm text-slate-500">Os dados ficam salvos no navegador automaticamente.</p>
              </div>
              {editandoId ? (
                <button
                  type="button"
                  onClick={limparFormulario}
                  className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Data</label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => handleChange('data', e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Descrição</label>
                <input
                  type="text"
                  value={form.descricao}
                  onChange={(e) => handleChange('descricao', e.target.value)}
                  placeholder="Ex.: venda de lente, pagamento de fornecedor..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                  >
                    <option>Entrada</option>
                    <option>Saída</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={(e) => handleChange('categoria', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                  >
                    {categoriasPadrao.map((categoria) => (
                      <option key={categoria}>{categoria}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Forma de pagamento</label>
                  <select
                    value={form.forma}
                    onChange={(e) => handleChange('forma', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                  >
                    {formasPadrao.map((forma) => (
                      <option key={forma}>{forma}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Valor</label>
                  <input
                    type="text"
                    value={form.valor}
                    onChange={(e) => handleChange('valor', e.target.value)}
                    placeholder="Ex.: 150.00"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Observação</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => handleChange('observacao', e.target.value)}
                  placeholder="Detalhes opcionais do lançamento"
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400"
                />
              </div>

              {erro ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{erro}</p> : null}

              <button className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:bg-sky-700">
                {editandoId ? 'Atualizar lançamento' : 'Salvar lançamento'}
              </button>
            </div>
          </form>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-xl font-semibold">Movimentações do caixa</h3>
                <p className="mt-1 text-sm text-slate-500">Busque, filtre, edite e exclua lançamentos salvos.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar lançamento"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                >
                  <option>Todos</option>
                  <option>Entradas</option>
                  <option>Saídas</option>
                </select>
                <input
                  type="date"
                  value={filtroDataInicio}
                  onChange={(e) => setFiltroDataInicio(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
                <input
                  type="date"
                  value={filtroDataFim}
                  onChange={(e) => setFiltroDataFim(e.target.value)}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="hidden grid-cols-[0.9fr_1.6fr_1fr_0.8fr_0.9fr_0.9fr_0.9fr] gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
                <span>Data</span>
                <span>Descrição</span>
                <span>Categoria</span>
                <span>Tipo</span>
                <span>Forma</span>
                <span className="text-right">Valor</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-slate-200">
                {lancamentosFiltrados.length ? (
                  lancamentosFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-3 px-5 py-4 lg:grid-cols-[0.9fr_1.6fr_1fr_0.8fr_0.9fr_0.9fr_0.9fr] lg:items-center"
                    >
                      <span className="text-sm text-slate-600">{formatDate(item.data)}</span>

                      <div>
                        <p className="font-medium text-slate-900">{item.descricao}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.observacao || 'Sem observação'}</p>
                      </div>

                      <span className="text-sm text-slate-600">{item.categoria}</span>
                      <span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.tipo === 'Entrada'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </span>
                      <span className="text-sm text-slate-600">{item.forma}</span>
                      <span className="text-right text-sm font-semibold text-slate-900">{formatMoney(item.valor)}</span>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">
                    Nenhum lançamento encontrado com os filtros atuais.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
