# Restart Corporal — patch inicial

Este pacote substitui o site estático atual por uma loja responsiva inspirada na organização de grandes e-commerces, mantendo a identidade Restart Corporal. Foi preparado para GitHub Pages + Supabase, sem etapa de build.

## 1. Arquivos
- `index.html`: entrada da loja.
- `assets/css/style.css`: layout responsivo.
- `assets/js/config.js`: configuração pública do Supabase e WhatsApp.
- `assets/js/app.js`: loja, catálogo, detalhes e painel administrativo.
- `supabase/schema.sql`: tabelas, políticas RLS e bucket de imagens.

## 2. Publicar no repositório
Faça upload/substituição dos arquivos preservando os caminhos. O `index.html` deve ficar na raiz do repositório. Não apague `.github/workflows` se já existir workflow de publicação que você utiliza.

Em Settings > Pages, mantenha a publicação pela branch `main` e pasta `/ (root)` (ou a configuração já utilizada pelo repositório).

## 3. Configurar o Supabase
1. Abra o projeto Supabase.
2. Entre em SQL Editor e execute todo o conteúdo de `supabase/schema.sql`.
3. Em Project Settings > API, copie a Project URL e a chave `anon`/`publishable`.
4. Cole esses dois valores em `assets/js/config.js`.
5. Configure `WHATSAPP_DEFAULT` com código do país e número, somente dígitos. Exemplo de formato: `595XXXXXXXXX`.
6. Ajuste `CURRENCY` e `LOCALE` conforme o mercado (ex.: `PYG`/`es-PY` ou `BRL`/`pt-BR`).

**Nunca use `service_role`, secret key, senha ou token privado no JavaScript público do GitHub.**

## 4. Criar o primeiro administrador
1. Em Supabase > Authentication > Users, crie um usuário com e-mail e senha.
2. Copie o UUID desse usuário.
3. No SQL Editor, execute (substituindo pelo UUID real):

```sql
insert into public.admin_users(user_id)
values ('UUID-DO-USUARIO');
```

O administrador entra em `https://restartcorporal.github.io/restart/#/admin`.

Não crie usuários públicos para administração. Use senha forte e habilite MFA no Supabase se disponível.

## 5. Imagens e identidade
- O banner e o retrato estão com placeholder intencional para não publicar uma fotografia incorreta ou de baixa resolução.
- Coloque sua fotografia autorizada em `assets/eduardo-monteiro.jpg` e depois podemos ajustar o CSS para exibi-la.
- No painel, os produtos aceitam URL pública de imagem. O bucket `product-images` já é criado pelo SQL para upload futuro.

## 6. Funcionalidades incluídas
- Layout de loja responsivo com busca, vitrine e catálogo.
- Categorias, detalhes de produto e contato por WhatsApp.
- Número geral e número opcional por produto.
- Preço opcional e texto de botão configurável.
- Login administrativo, CRUD de produtos e categorias, configurações da loja.
- Publicação/rascunho de produtos via `is_published`.
- RLS para limitar alterações a usuários autorizados como administradores.

## 7. Limitações desta versão
- Não inclui gateway de pagamento nem checkout com cobrança. A ação de compra é uma solicitação por WhatsApp.
- Não inclui pedidos, carrinho, estoque, cupons ou upload visual de imagem no painel nesta primeira entrega.
- O layout é uma implementação original inspirada na arquitetura de navegação e vitrines da referência; não copia marca, textos ou código de terceiros.
- Antes de publicar qualquer produto, confirme sua regularidade sanitária, autorização de venda e regras de publicidade no país de destino. Produtos sujeitos a receita/controle não devem ser oferecidos para compra direta nem usados para contornar essas exigências.
- Publique política de privacidade revisada antes de coletar dados pessoais ou sensíveis.

## 8. Teste
1. Abra a URL pública e confirme que a página carrega.
2. Antes de conectar o Supabase, a loja exibe produtos demonstrativos sem opção de venda real.
3. Depois de configurar o Supabase e criar o administrador, entre no painel.
4. Cadastre primeiro itens institucionais/serviços ou produtos cuja comercialização esteja devidamente autorizada.
5. Confirme a navegação e os links WhatsApp em celular e desktop.
