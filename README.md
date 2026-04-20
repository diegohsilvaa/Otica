# Óticas Fácil / Ótica Plena Visão

Versão multiempresa com:
- tela de login por email da ótica
- identificação automática da empresa pelo email
- separação do livro caixa por `codempresa`
- cadastro de clientes mantido como cadastro único
- exames e financeiro do cliente mantidos como já estavam

## Ordem para rodar no banco
1. Rode o script já existente das tabelas principais do projeto
2. Rode `multiempresa_otica.sql`
3. Se você usa realtime no Supabase, habilite realtime para:
   - `empresas`
   - `lancamentos_caixa`
   - `aberturas_caixa`
   - `fechamentos_caixa`
   - `clientes`
   - `cliente_exames`
   - `cliente_financeiro`

## Emails padrão inseridos no script
- `facil@otica.com.br` → Ótica Fácil
- `plena@otica.com.br` → Ótica Plena Visão

Você pode trocar esses emails direto na tabela `public.empresas`.

## Observação importante
O login desta versão é por email identificado no banco. Para segurança forte de usuário/senha, o próximo passo ideal é ligar isso ao Supabase Auth.
