# Contributing

Thanks for wanting to help. Fontroom is plain HTML, CSS and JavaScript with no build step, so getting started is quick.

## Setup

```bash
git clone https://github.com/appdever01/fontroom.git
cd fontroom
npm install
npm run dev
```

Open http://localhost:4815. Edit files in `public/` and refresh.

## Before you open a pull request

```bash
npm run check
npm test
```

Both should pass. If you fix a bug, add a test in `tests/` that would have caught it.

## Good first contributions

- A new preview template. Add an entry to `TEMPLATES` in `public/js/templates.js` with a `site()` and an `app()` function, and its styles in `public/css/app.css`. Mark text that should use the heading font with the `h` class.
- More fonts or pairings in `FONT_DATA` and `PAIRS` in `public/js/core.js`. Names must match Google Fonts exactly.
- Code output for another framework in `buildCode()`.

## Guidelines

- Keep it dependency-free in the browser. No frameworks or bundlers for the site itself.
- Every control should work with a keyboard and have a visible focus state.
- Use custom, accessible dropdowns rather than native `<select>`, to match the rest of the UI.
- Error messages say what went wrong and what to do next.
- `public/slop.html` and `public/slop-app.html` are a deliberately bad snapshot used as a "before" example. Leave it as it is.
