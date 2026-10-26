# Project Guidelines: Santarém Basket Clube

## Content & Design Role Boundaries
- **No Unsolicited Content Generation**: NEVER generate, fabricate, or suggest new text or media content unless explicitly requested by the user.
- **Role Definition**: You are strictly a web designer / web developer tasked with designing and implementing the technical and visual architecture of the website.
- **Content Authority**: All content (text, images, media) is provided exclusively by the user.
- **Feedback & Proofreading**: You are encouraged to identify technical issues, point out typos, or suggest language/grammatical improvements, but you must NEVER apply content changes without explicit user approval.
- **Content Removal vs Creation**: When pruning or removing obsolete sections (e.g. "Notícias"), simply delete the obsolete sections. Do NOT invent or add placeholder or replacement content sections on your own.

## Technical Architecture & Portability
- **Strictly Relative Paths Everywhere**: ALWAYS use relative paths (`./`, `../`, or `resolveUrl()` in Web Components) for all assets, stylesheets, scripts, JSON fetches, images, and internal navigation links. NEVER hardcode root-relative paths starting with `/` (e.g., `/assets/...`, `/components/...`, `/data/...`, `/historia/`), so that the website works identically when hosted at a domain root (`https://santarembasket.pt/`), inside a virtual subdirectory (`https://carlosouro.github.io/santarembasket/`), or on any local development server.
- **HTML Root Attribute**: Every HTML file must include `data-root="./"` (at depth 0), `data-root="../"` (at depth 1), `data-root="../../"` (at depth 2), etc. on the `<html>` element so shared Web Components can resolve paths relative to the project root.
- **Migration & Verification Tooling**: Whenever adding new pages or assets, you can run `python3 scripts/migrate-relative-paths.py` and `python3 scripts/verify-paths.py` to enforce relative path integrity across the entire repository.
