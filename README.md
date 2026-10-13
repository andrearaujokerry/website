# website

My personal website

- [Requirements](REQUIREMENTS.md): what the site needs to do, prioritised P0–P2
- [Design demos](demos/README.md): three visual directions to choose from
- [Workplan](WORKPLAN.md): how the Editorial direction gets built and launched

## Development

Built with [Astro](https://astro.build). Needs Node 22.22.3 or newer (with nvm, run `nvm use` to pick up `.nvmrc`).

```sh
npm install
npm run dev           # local dev server at http://localhost:4321
npm run check         # type-check
npm run lint          # ESLint, including accessibility rules
npm run format        # format with Prettier
npm run build         # production build into dist/
```

CI runs `check`, `lint`, `format:check` and `build` on every pull request.
