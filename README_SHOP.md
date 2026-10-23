# Zapwise site, `shop` branch (not pushed)

Mobile-first static site: inline CSS, ~1.5 KB inline vanilla JS (progressive: typed-prompt demo, scroll reveal, card glow; everything works with JS off), no external fonts, CDNs or requests. Hi-tech redesign Oct 22, 2026: grid/glow background, glass cards, terminal sample prompt, ticker + Latest Shorts (real titles from the YouTube API), sticky mobile CTA (utm_medium=sticky_bar), prefers-reduced-motion respected. Brand palette: #070814 / #f4efe4 / #f0a202 / #5ce1e6.

## Before pushing
1. List the products on Payhip (see /workspace/zapwise/products/*/listing.md).
2. Paste each product's URL into `payhip_links.json`.
3. Run `python3 swap_links.py`. It should print `still placeholders: none`.
4. Test locally: `python3 -m http.server 8000`, then open http://localhost:8000.
5. `git checkout shop && git push origin shop:main` (or merge into main). GitHub Pages serves main.

The Toolkit link (https://payhip.com/b/4WuXf) is already real.

## Link tagging
Every Payhip button has `?utm_source=website&utm_medium=<where>&utm_campaign=shop`, where `<where>` is one of hero_free, card, inside_free, product_page or sticky_bar.

## Files
- `index.html`: hero + free CTA, shop cards (bundle marked "Best value"), real sample prompts, FAQ, footer.
- `p/*.html`: one page per product, each with its own title, description, canonical, OG/Twitter tags and Product JSON-LD (price + offer, no ratings).
- `img/<key>.jpg` (640×360 cards), `img/og-<key>.jpg` (1200×630 share images).
- `sitemap.xml`, `robots.txt`, `404.html`.

## Regenerating
Payhip links are now read from payhip_links.json by the generator directly. Refresh the Shorts list (read-only API) with `python3 build_shop.py --refresh-shorts`.

The generator lives outside the repo at /workspace/zapwise/site_tools/build_shop.py. Edit `PRODUCTS` there and re-run it, then run swap_links.py again.
