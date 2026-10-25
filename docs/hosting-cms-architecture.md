# Arquitetura de Alojamento e Gestão de Conteúdos (CMS)
**Projeto:** Santarém Basket Clube (`santarembasket.pt`)  
**Data de Aprovação:** Outubro 2026  

---

## 1. Visão Geral e Objetivos

Modernizar o website do Santarém Basket Clube migrando de uma infraestrutura WordPress legada (lenta, com custos de servidor e manutenção técnica) para uma **arquitetura estática moderna, rápida, segura e com custo de alojamento zero (€0)**.

O sistema foi desenhado para permitir que qualquer elemento da direção ou voluntário não-técnico consiga atualizar textos, horários de treinos, contactos, equipas e plantéis de atletas anualmente através de um painel visual amigável (sem tocar em código).

---

## 2. Pilares da Infraestrutura

O ecossistema é mantido no mínimo absoluto de serviços para facilitar a passagem de testemunho no futuro:

| Componente | Plataforma / Serviço | Função | Custo |
| :--- | :--- | :--- | :--- |
| **Domínio Oficial** | `dominios.pt` | Registo do domínio `santarembasket.pt` e apontamento DNS. | 32,90 € / ano |
| **Alojamento & CDN** | **GitHub Pages** | Alojamento estático global, certificado SSL/HTTPS automático e builds a partir do branch `main`. | **0 € (Gratuito)** |
| **Código & Histórico** | **GitHub Repository** | Controlo de versões, histórico completo de todas as alterações e cópias de segurança automáticas. | **0 € (Gratuito)** |
| **Backoffice / CMS** | **Pages CMS** (`pagescms.org`) | Interface visual estilo Word para a direção editar conteúdos e atletas no browser via login GitHub. | **0 € (Gratuito)** |
| **Formulário de Sócios** | **Google Forms + Sheets** | Formulário de adesão a sócio com sincronização automática numa folha de cálculo partilhada. | **0 € (Gratuito)** |
| **Formulário de Contactos** | **Web3Forms** | Envio direto de mensagens a partir do site para os emails da direção (`xxxx@gmail.com`) sem spam. | **0 € (Gratuito)** |

---

## 3. Limites e Capacidade do Plano Gratuito (GitHub Pages)

* **Tráfego Mensal:** 100 GB / mês (capacidade para ~40.000 a 50.000 visitas mensais, margem astronómica para a dimensão do clube).
* **Armazenamento:** 1.000 MB (1 GB). O site com ~150 atletas e respetivas fotografias otimizadas para web ocupa menos de 30-40 MB (~3% a 4% do limite).
* **Segurança:** Certificado SSL/HTTPS gerido e renovado automaticamente pela Microsoft/GitHub via Let's Encrypt.
* **Disponibilidade:** 99.9% de uptime, sem base de dados MySQL ou PHP sujeitos a ataques ou quebras.

---

## 4. Backoffice (Pages CMS) e Gestão Anual

O ficheiro `.pages.yml` no repositório define as coleções e campos editáveis pelo clube:

1. **Páginas Institucionais:**
   * Textos ricos (WYSIWYG) para *História*, *Órgãos Sociais*, *Estatutos*, *Regulamentos*.
   * Upload direto de ficheiros PDF (ex.: regulamento interno ou convocatórias de assembleia).
2. **Horários de Treinos:**
   * Tabela semanal estruturada (escalão, dia da semana, horas de início/fim, pavilhão).
3. **Gestão Anual de Equipas e Atletas:**
   * Coleção de **Equipas / Escalões** (Minis até Seniores).
   * Coleção de **Atletas**: Ficha com Nome, Escalão, Número/Dorsal, Posição, Fotografia de perfil e estado de atividade na época corrente.
   * Criação com 1 clique (`+ Novo Atleta`) e drag-and-drop de imagens.

---

## 5. Racionalização de Custos e Comunicação

* **Cancelamento de Serviços:** O plano de alojamento cPanel/WordPress na `dominios.pt` é cancelado após a publicação do novo site estático.
* **Domínio:** Mantém-se apenas o registo do domínio `santarembasket.pt` na `dominios.pt` (32,90 €/ano).
* **Emails:** Desativação da caixa legada `geral@santarembasket.pt` em favor das contas ativas do clube no Gmail (`xxxx@gmail.com`).
