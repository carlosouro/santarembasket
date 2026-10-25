# Integração do Feed do Instagram: Análise de Opções e Arquitetura
**Projeto:** Santarém Basket Clube (`santarembasket.pt`)  
**Data:** Outubro 2026  
**Estado Atual:** Bloco nativo de conversão com link direto para `@santarembasket` (Opção 4 ativa)

---

## 1. Contexto e Enquadramento

Nas notas da direção foi mencionada a intenção de substituir a secção de notícias por um feed automático do Instagram, sugerindo o plugin **Smash Balloon**:
> *"Na página de entrada, as notícias abaixo dos links para os formulários de inscrição deixam de existir e pode entrar um plugin com update automático de conteúdo do Instagram (Smash Balloon - a analisar se é gratuito)."*

### Porque é que o Smash Balloon não se aplica diretamente?
* O **Smash Balloon** é um plugin desenvolvido em **PHP para WordPress**. Como o novo website do Santarém Basket Clube foi modernizado para uma **arquitetura estática Jamstack (HTML/JS/GitHub Pages)** para eliminar custos de alojamento e garantir velocidade máxima, não existe um servidor PHP ou base de dados WordPress a correr no backend.
* O Smash Balloon disponibiliza também um serviço em nuvem autónomo, mas é uma subscrição comercial paga (a partir de ~49$/ano).

### Como funciona a API do Instagram hoje (Meta)?
1. **Fim do Scraping Público:** A Meta implementou deteção rígida de bots. É tecnicamente impossível ler fotografias de uma conta de Instagram de forma fiável sem passar pela API oficial da Meta.
2. **Meta Graph API:** A API oficial exige que a conta de Instagram seja **Profissional / Criador de Conteúdo** (ou associada a uma Página do Facebook).
3. **Expiração de Tokens (Regra dos 60 Dias):** Os *Access Tokens* de longa duração da Meta expiram ao fim de **60 dias**. Qualquer solução sem servidor necessita de um processo de renovação automática, caso contrário o feed deixa de carregar ao fim de dois meses.

---

## 2. As 4 Opções Disponíveis

### Opção 1: Widgets SaaS Especializados (No-Code / Plug-and-Play)
Serviços externos especializados em agregar e servir feeds sociais via CDN. Exemplos recomendados: **Behold.so**, **Elfsight**, **Curator.io**, **SnapWidget**.

* **Como funciona:**
  1. Cria-se uma conta gratuita num serviço como [Behold.so](https://behold.so/) ou [Elfsight](https://elfsight.com/).
  2. Liga-se a conta `@santarembasket` via autenticação do Instagram uma única vez.
  3. O serviço trata da renovação silenciosa dos tokens nos seus próprios servidores e gera uma linha de código (`<script>` ou `<iframe>`) para colar no HTML.
* **Vantagens:**
  * Instalação em 5 a 10 minutos sem necessidade de código ou configurações no portal de programadores da Meta.
  * Grelha visualmente apelativa com fotos clicáveis e caixas modais.
* **Limitações dos Planos Gratuitos:**
  * **Elfsight:** O plano gratuito tem um teto de apenas **200 visualizações de página por mês** (esgota rapidamente num clube com tráfego diário).
  * **SnapWidget:** Frequentemente insere marcas de água (*"Powered by..."*) e limita o layout no plano grátis.
  * **Behold.so:** É a melhor opção no segmento gratuito: permite até **1.200 pedidos/mês**, atualiza 1 vez por dia e fornece um endpoint JSON limpo ou widget sem anúncios intrusivos.

---

### Opção 2: Automação GitHub Action Diária (100% Gratuito, Seguro e Nativo)
Esta é a **melhor solução técnica de longo prazo** se o clube pretender ter as fotografias diretamente na página sem custos de subscrição.

* **Arquitetura da Solução:**
  1. **GitHub Action Agendada (`.github/workflows/sync-instagram.yml`):**
     * Executa automaticamente uma vez por dia (ex.: às 06:00 UTC) via cron no GitHub Actions (gratuito).
     * Faz um pedido à API oficial da Meta (`https://graph.instagram.com/me/media`).
     * Renova o token de 60 dias automaticamente via endpoint de *refresh token*.
     * Guarda as últimas 6 a 8 publicações (URL da imagem, link do post, legenda e data) num ficheiro estático `data/instagram.json` e faz commit automático no repositório.
  2. **Componente Web `<sbc-instagram-feed>`:**
     * Lê diretamente de `data/instagram.json`.
     * Renderiza uma grelha moderna de fotos perfeitamente integrada no design do SBC.
* **Vantagens:**
  * **Custo zero absoluto para sempre (€0)**.
  * **Sem limites de visualizações de página**: Pode ter 100.000 visitas e o feed nunca bloqueia nem atinge tetos.
  * **Performance máxima**: As imagens são servidas de forma estática sem atrasar o carregamento inicial da página com scripts pesados de terceiros.
  * **Tolerância a falhas**: Se a API da Meta estiver temporariamente em baixo ou a conta sofrer manutenção, a página inicial **nunca quebra** (continua a mostrar as últimas fotos guardadas no JSON).
* **Desvantagem:**
  * Requer um passo inicial de configuração: criar uma aplicação simples no portal [developers.facebook.com](https://developers.facebook.com/) e adicionar o token aos *GitHub Secrets* do repositório.

---

### Opção 3: Embeds Oficiais Nativos da Meta (Posts / Reels Individuais)
* **Como funciona:**
  * Copiar o código de incorporação oficial fornecido pelo Instagram (`instagram.com/p/.../embed`) para publicações específicas (ex.: anúncio de torneio, vitória importante ou campanha de novos sócios).
* **Vantagens:**
  * 100% suportado e oficial da Meta.
* **Desvantagens:**
  * Não é um feed cronológico automático; exige atualizar manualmente o código HTML sempre que se queira destacar um novo post.
  * O script `embed.js` da Meta é pesado e afeta as pontuações de velocidade (*Core Web Vitals*).

---

### Opção 4: Bloco Promocional Oficial com Link Direto (Solução Atual)
* **Como funciona:**
  * Um bloco limpo e destacado na página inicial promovendo a presença do SBC no Instagram (`@santarembasket`), acompanhado de botão de ação direta que abre a aplicação.
* **Vantagens:**
  * **Zero manutenção e zero risco de falha:** Sem tokens a expirar, sem dependência de serviços externos e sem risco de quebra.
  * **Excelente experiência móvel:** Mais de 75% dos visitantes de sites desportivos acedem a partir de smartphones. Ao clicarem no link, o telemóvel abre diretamente a **aplicação nativa do Instagram** (onde o utilizador já tem sessão iniciada e pode interagir de imediato — gostar, comentar, ver Stories e seguir a página).
  * **Velocidade pura:** Carregamento instantâneo da página sem pedidos externos desnecessários.

---

## 3. Matriz Comparativa

| Critério | Opção 1: SaaS (ex: Behold) | Opção 2: GitHub Action Diária | Opção 3: Meta Embeds | Opção 4: Bloco Promocional (Atual) |
| :--- | :---: | :---: | :---: | :---: |
| **Custo Financeiro** | Grátis com limites / Pago | **0 € (100% Gratuito)** | 0 € | **0 €** |
| **Atualização Automática** | Sim | Sim (1x ao dia) | Não (Manual) | Não aplicável |
| **Risco de Bloqueio por Tráfego** | Médio/Alto (limite mensal) | **Nenhum** | Nenhum | **Nenhum** |
| **Risco de Quebra por Token** | Baixo (gerido pelo SaaS) | Baixo (renovação por cron) | Nenhum | **Zero** |
| **Impacto na Velocidade da Página** | Médio (script externo) | **Zero (JSON local)** | Alto (iframe Meta) | **Zero** |
| **Esforço Inicial de Configuração** | 10 minutos | ~45 minutos (Meta App) | 5 min por post | **Concluído (0 min)** |

---

## 4. Guia de Implementação Futura (Caso o Clube Decida Ativar)

### Caminho A: Implementar via Behold.so (Mais Simples)
1. Registar conta gratuita em [behold.so](https://behold.so/).
2. Conectar a conta de Instagram `@santarembasket`.
3. Escolher formato "Grid" (ex.: 6 publicações, 3 colunas).
4. Copiar o snippet gerado e colá-lo na secção `#comunidade` do ficheiro `index.html`.

### Caminho B: Implementar via GitHub Action (Mais Robusto & Ilimitado)
1. Registar uma aplicação gratuita no [Meta for Developers](https://developers.facebook.com/) do tipo *Instagram Basic Display*.
2. Gerar o token de utilizador para a conta `@santarembasket`.
3. Adicionar o token aos segredos do repositório GitHub (`Settings > Secrets > Actions > INSTAGRAM_TOKEN`).
4. Criar o ficheiro de workflow `.github/workflows/instagram-sync.yml` com um script Node/Python que faz fetch aos endpoints da API e grava em `data/instagram.json`.
5. Substituir o card atual em `index.html` pelo componente `<sbc-instagram-feed>`.
