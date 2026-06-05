# Baliza — Setup em 3 passos

Gestão de licenças e condicionantes ambientais.
HTML + Supabase. Sem npm, sem build, sem servidor.

---

## 1. Supabase (5 min)
1. supabase.com → nova conta → novo projeto
2. SQL Editor → cole `schema.sql` → Run
3. Settings → API → copie URL e anon key

## 2. Configurar
Abra `js/config.js` e preencha:
```js
const SUPABASE_URL = 'https://SEU_PROJETO.supabase.co'
const SUPABASE_KEY = 'sua_anon_key'
```

## 3. Publicar
Arraste a pasta `Baliza` para **netlify.com** → URL pública na hora.

---

## Fluxo de uso
1. Cadastre-se em `/login.html`
2. Clique em **+ Nova licença**
3. Passo 1: nome do cliente (+ CNPJ opcional, busca automática)
4. Passo 2: tipo, número, órgão e datas da licença
5. Passo 3: informe o número de condicionantes
6. Passo 4: preencha cada condicionante com sua descrição e prazo
7. Salvar → aparece no painel com alertas de prazo

## Arquivos
```
Baliza/
  login.html          tela de acesso
  app.html            aplicação (painel + licenças)
  css/baliza.css      design system
  js/config.js     ← EDITE AQUI suas chaves
  js/app.js           lógica
  schema.sql          execute no Supabase
  design/             ícone e identidade visual
```
