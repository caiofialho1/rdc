# Assinador PPL

Assina PDFs com carimbo de assinatura manuscrita, logo, nome, cargo, empresa, data, hora, fuso, localização por GPS e código SHA-256 do documento original. Aceita vários PDFs de uma vez e exporta cada um separado ou todos num ZIP.

Todo o processamento acontece no navegador. Nenhum PDF é enviado a servidores. A imagem da assinatura, o logo e a senha (hash PBKDF2) ficam guardados só no navegador de quem usa.

Para usar: abra `index.html` no Chrome ou Edge, ou publique pelo GitHub Pages (Settings → Pages → Deploy from a branch → `main` / root).

O GPS só funciona em HTTPS (GitHub Pages) ou abrindo o arquivo localmente.
