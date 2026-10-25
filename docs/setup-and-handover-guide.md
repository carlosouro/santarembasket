# Guia de Configuração e Passagem de Testemunho
**Projeto:** Website Santarém Basket Clube (`santarembasket.pt`)  
**Data:** Outubro 2026  
**Idioma:** Português de Portugal (pt-PT)

---

## 🎯 Resumo da Solução

O novo website do Santarém Basket Clube foi completamente modernizado e transformado numa solução estática, ultrarrápida, segura e **100% gratuita para sempre** a nível de alojamento.

* **Alojamento & CDN:** GitHub Pages (Custo: 0,00 €)
* **Backoffice Visual:** Pages CMS (`pagescms.org`) via GitHub (Custo: 0,00 €)
* **Formulários Dinâmicos:** Web3Forms para Contactos/Encomendas e Google Forms para Inscrições/Sócios (Custo: 0,00 €)
* **Único Custo Recorrente:** Renovação anual do domínio `.pt` na `dominios.pt` (32,90 € / ano)

Abaixo encontras o passo a passo detalhado para colocar o website em produção e ligar todos os serviços.

---

## 1. Configuração do Repositório e GitHub Pages

### 1.1. Criar o Repositório no GitHub
1. Entra na tua conta GitHub (ou cria uma conta com o email do clube).
2. Cria um novo repositório:
   * **Repository name:** `santarembasket` (ou outro nome à escolha).
   * **Visibility:** **Public** (necessário para usufruir de GitHub Pages gratuito com domínio personalizado).
   * Não inicializes com README (o projeto local já possui todos os ficheiros).

### 1.2. Fazer o Push do Código Local
No teu terminal, dentro da pasta do projeto (`/Users/carlosouro/Sparkoro/santarembasket`), executa:

```bash
# Se usas 1Password SSH Agent:
SSH_AUTH_SOCK="/Users/carlosouro/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock" git remote add origin git@github.com:<O-TEU-UTILIZADOR>/santarembasket.git

# Ou via HTTPS se preferires:
# git remote add origin https://github.com/<O-TEU-UTILIZADOR>/santarembasket.git

git branch -M main
git push -u origin main
```

### 1.3. Ativar o GitHub Pages
1. No teu repositório no GitHub, vai a **Settings** (separador superior) ➔ **Pages** (menu lateral esquerdo).
2. Na secção **Build and deployment**:
   * **Source:** `Deploy from a branch`
   * **Branch:** Seleciona `main` e a pasta `/ (root)`.
   * Clica em **Save**.
3. Na secção **Custom domain**:
   * Escreve: `santarembasket.pt`
   * Clica em **Save** (o ficheiro `CNAME` já incluído no repositório será validado).
4. Aguarda a verificação do DNS e marca a caixa **Enforce HTTPS** para ativar o certificado SSL automático e gratuito.

---

## 2. Configuração de DNS na Dominios.pt

Para ligar o domínio `santarembasket.pt` aos servidores globais do GitHub Pages:

### 2.1. Aceder à Gestão de DNS
1. Faz login na tua Área de Cliente em [dominios.pt](https://my.dominios.pt/).
2. Acede a **Domínios** ➔ **Os Meus Domínios** ➔ Seleciona `santarembasket.pt`.
3. Clica em **Gestão de Zona DNS** (DNS Management).

### 2.2. Registos DNS a Inserir / Atualizar
Substitui os registos `A` antigos (que apontavam para o servidor WordPress da dominios.pt) pelos seguintes:

#### A) Registos A (Domínio Raiz `@` ou `santarembasket.pt`):
Cria 4 registos do tipo **A**:
* **Nome / Host:** `@` (ou em branco, consoante o painel)
* **TTL:** `3600`
* **Tipo:** `A`
* **IPs do GitHub Pages:**
  1. `185.199.108.153`
  2. `185.199.109.153`
  3. `185.199.110.153`
  4. `185.199.111.153`

#### B) Registo CNAME (Subdomínio `www`):
* **Nome / Host:** `www`
* **TTL:** `3600`
* **Tipo:** `CNAME`
* **Valor:** `<O-TEU-UTILIZADOR>.github.io.` (ou alternativamente `santarembasket.pt.`)

> ⏱ **Nota de Propagação:** A propagação de DNS demora habitualmente entre 15 minutos a 2 horas (no máximo 24h).

### 2.3. Cancelamento do Plano de Alojamento Legado
Após confirmares que o novo site está ativo e funcional em `https://santarembasket.pt`:
1. Cancela a subscrição do alojamento cPanel/WordPress na `dominios.pt` para evitar cobranças futuras desnecessárias.
2. **IMPORTANTE:** Mantém **ativa** apenas a renovação anual do registo do domínio `santarembasket.pt` (32,90 € / ano).

---

## 3. Configuração do Pages CMS (`pagescms.org`)

O Pages CMS é o painel de administração visual para a direção do clube gerir conteúdos sem tocar em código nem instalar software.

### 3.1. Primeiro Acesso
1. Acede a [pagescms.org](https://pagescms.org).
2. Clica em **Sign in with GitHub**.
3. Autoriza a aplicação e seleciona o repositório `santarembasket`.
4. O Pages CMS deteta automaticamente o ficheiro `.pages.yml` já configurado na raiz do projeto.

### 3.2. O que a Direção pode Gerir no Pages CMS
No painel lateral surgem 4 secções intuitivas em português:
1. **📢 Destaques & Formulários (`data/destaques.json`):**
   * Adicionar, editar ou remover avisos da época, notícias com link externo e formulários de inscrição.
   * Ativar/desativar o botão "Mostrar na Página Principal".
2. **🏀 Horários de Treinos (`data/treinos.json`):**
   * Atualizar os dias, horários e pavilhões de cada escalão (Minis, Sub-12, Sub-14, Sub-16, Sub-18 e Seniores).
   * **Magia da Arquitetura:** Uma única alteração neste ficheiro atualiza imediatamente o horário na Homepage, na página `/main/equipas/`, na página `/main/treinos/` e na página individual da respetiva equipa!
3. **🤝 Parceiros, Apoios & Protocolos (`data/parceiros.json`):**
   * Gestão das entidades institucionais, patrocinadores e protocolos de saúde/fisioterapia com descontos para sócios.
4. **🏆 Palmarés & Estatísticas (`data/palmares.json`):**
   * Atualizar os números do clube (anos de história, títulos distritais e nacionais).

### 3.3. Como Publicar Alterações
* Após editar qualquer texto ou horário, clica no botão verde **Save** / **Publish**.
* O Pages CMS cria automaticamente um commit no GitHub.
* O GitHub Pages deteta o commit e atualiza o website online em cerca de **30 a 60 segundos**.

---

## 4. Configuração do Web3Forms (Formulários de Contacto e Merchandising)

Os formulários de **Contactos** (`main/contacto/index.html`) e **Merchandising** (`main/merchandising/index.html`) utilizam o serviço Web3Forms, que entrega as mensagens diretamente no email oficial do clube sem necessidade de PHP, servidor ou base de dados.

### 4.1. Obter a Chave Gratuita de Acesso (Access Key)
1. Acede a [web3forms.com](https://web3forms.com).
2. No campo **Enter your email**, introduz o email oficial do clube: `santarembasket@gmail.com`.
3. Clica em **Create Access Key**.
4. Receberás um email da Web3Forms com a tua chave (ex.: `8f7b3c21-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).

### 4.2. Inserir a Chave no Website
Abre os dois ficheiros seguintes e substitui `YOUR_WEB3FORMS_ACCESS_KEY` pela chave recebida:
1. `main/contacto/index.html` (linha com `<input type="hidden" name="access_key" value="...">`)
2. `main/merchandising/index.html` (linha com `<input type="hidden" name="access_key" value="...">`)

Submete as alterações com um `git commit` e `git push`. A partir desse momento:
* Todas as mensagens enviadas pela página de contactos chegam a `santarembasket@gmail.com`.
* Todas as encomendas de merchandising chegam com a identificação do atleta, tamanhos e artigos pretendidos.
* O serviço inclui proteção anti-spam integrada (botcheck honeypot).

---

## 5. Integração com Google Forms (Inscrições & Sócios)

Em vez de formulários complexos no site que exigem manutenção:
1. As propostas de **Novo Sócio** e **Inscrições de Atletas** são geridas através do Google Forms oficial da conta Google do clube (`santarembasket@gmail.com`).
2. Os links estão configurados e podem ser atualizados a qualquer momento no Pages CMS (`data/destaques.json`) ou na página `main/novo-socio/index.html`.
3. **Vantagem para a Secretaria:** Todas as respostas ficam automaticamente organizadas numa folha de cálculo Google Sheets partilhada entre a direção, com registo de data/hora, NIF e dados de contacto.

---

## 6. Verificação Final e Testes Recomendados

Antes de anunciar publicamente:
- [ ] Verificar que o site abre com cadeado verde HTTPS (`https://santarembasket.pt`).
- [ ] Testar o formulário de contacto na página `/main/contacto/` e verificar a receção do email de teste.
- [ ] Testar a submissão de um pedido na página `/main/merchandising/`.
- [ ] Testar a abertura do menu e gaveta mobile num telemóvel (iOS e Android).
- [ ] Fazer login no Pages CMS e testar uma alteração num horário de treino para comprovar a sincronização automática.
