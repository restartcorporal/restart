-- Execute uma vez no Supabase > SQL Editor.
-- Libera leitura pública somente das configurações visuais e de contato da loja.
drop policy if exists "public reads store settings" on public.store_settings;

create policy "public reads store settings"
on public.store_settings
for select
to anon, authenticated
using (
  key in (
    'whatsapp',
    'store_name',
    'logo_url',
    'banner_image_url',
    'banner_eyebrow',
    'banner_title',
    'banner_text',
    'promo_image_url',
    'topline_text',
    'footer_caption',
    'color_navy',
    'color_navy_dark',
    'color_green',
    'color_green_dark',
    'color_bg',
    'color_ink',
    'color_card',
    'currency_code',
    'currency_locale'
  )
);
