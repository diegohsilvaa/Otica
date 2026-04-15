# Óticas Fácil

Versão com foco em clientes e financeiro.

## O que foi ajustado

- tela de clientes com busca moderna
- clique no cliente abre uma janela pequena sobreposta
- visualização compacta inspirada no modelo Delphi enviado
- campo código sem o texto “gerado automaticamente”
- manutenção do livro caixa e do analítico em modal
- realtime no Supabase também para a tabela `clientes`

## Arquivos SQL

- `clientes.sql`: cria a tabela de clientes
- `realtime.sql`: habilita realtime para clientes e caixa

## Rodar localmente

```bash
npm install
npm run dev
```

## Variáveis no Vercel / Vite

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
