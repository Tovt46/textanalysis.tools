# textanalysis.tools identity

The approved September 9, 2026 identity uses four text strokes converging toward
a coral dot. `app/brand.ts` is the canonical mark geometry and color source;
`app/BrandSymbol.tsx` renders it in the shared site navigation.

Use the on-light logo on ivory/white and the on-dark logo on graphite. Both SVGs
have transparent backgrounds. Coral (#ed967f) is reserved for small details;
backgrounds and primary controls stay neutral.

`lettering.json` contains outlined Geist lettering (weight 650 for the wordmark)
so generated assets do not depend on system fonts. Geist is by Vercel and is
licensed under the included SIL Open Font License. Its variable font source is
https://github.com/google/fonts/tree/main/ofl/geist. The font binary is not shipped.

To rebuild with the project's Node 24 environment:

```sh
node scripts/generate-brand-assets.mjs
```

The generator uses Sharp already present through Next.js, writes `public/brand/`,
and replaces the favicon, Apple/Android icons, and 1200×630 social images.
Increment `BRAND_VERSION` when publishing revised assets to refresh cached links.
