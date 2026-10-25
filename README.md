# Santarém Basket Clube — Static Website

Este projeto contém a versão estática completa e autónoma do website do **Santarém Basket Clube** ([santarembasket.pt](https://santarembasket.pt)), clonado e desacoplado do WordPress original.

O objetivo desta transição é eliminar a lentidão, as vulnerabilidades e os custos de manutenção da infraestrutura de base de dados e backoffice do WordPress, permitindo que todas as alterações futuras sejam geridas diretamente de forma estática com auxílio de IA.

---

## 📁 Estrutura do Projeto

- **[`index.html`](file:///Users/carlosouro/Sparkoro/santarembasket/index.html)**: Ponto de entrada raiz com redirecionamento automático para `/main/`.
- **[`main/`](file:///Users/carlosouro/Sparkoro/santarembasket/main/)**: Diretoria principal com todas as páginas HTML, subpáginas e artigos:
  - **Páginas Principais**: `historia/`, `orgaos-sociais/`, `estatutos/`, `regulamento-interno/`, `titulos-nacionais/`, `palmares/`, `treinos/`, `novo-socio/`, `contacto/`
  - **Notícias e Blog**: `noticias/` (com todas as páginas de paginação `page/2/`, etc.) e todos os artigos individuais
  - **Eventos e Jogos**: Calendário (`calendario/`), diretoria de eventos (`events/`), jogos e treinos de cada escalão
  - **Desporto e Equipas (SportsPress)**: `team/` (todas as equipas), `player/` (perfis de jogadores), `staff/`, `table/` (tabelas classificativas), `calendar/`
  - **Taxonomias**: Categorias (`categoria/`) e etiquetas (`etiqueta/`)
  - **Arquivos Temporais**: Anos e meses (`2023/`, `2024/`, `2025/`, `2026/`)
- **`main/wp-content/uploads/`**: Todo o acervo original de imagens, logótipos, fotografias de equipas e documentos PDF (sem recurso a imagens geradas por IA).
- **`main/wp-content/themes/` & `plugins/`**: Todos os estilos CSS (Divi, EventON, SportsPress), ficheiros JavaScript e tipos de letra (`.woff2`, `.woff`, `.ttf`).
- **`wp-content/` & `wp-includes/`**: Links simbólicos na raiz para garantir compatibilidade com qualquer referência de raiz.
- **[`scripts/clone_site.py`](file:///Users/carlosouro/Sparkoro/santarembasket/scripts/clone_site.py)**: Script em Python que realizou a extração, catalogação via WP REST API, download paralelo, conversão de links absolutos para caminhos relativos e auditoria de integridade.

---

## 🚀 Como Executar Localmente

Como o website utiliza tipos de letra web e módulos JavaScript que requerem um servidor HTTP (devido a políticas CORS do navegador), utilize um servidor web estático:

### Com Python 3:
```bash
python3 -m http.server 9296
```
Depois abra no browser: [http://localhost:9296/](http://localhost:9296/)

### Com Node / npx:
```bash
npx serve -p 9296 .
```

---

## 🌐 Alojamento Estático

O site está pronto para ser publicado em qualquer serviço de alojamento estático moderno:
- **Cloudflare Pages**
- **Vercel**
- **Netlify**
- **GitHub Pages**
- **AWS S3 + CloudFront**
- **Nginx / Caddy** (servindo a diretoria raiz)
