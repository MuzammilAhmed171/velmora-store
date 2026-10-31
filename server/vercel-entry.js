// Vercel Services entrypoint - uses pre-bundled server (all deps included).
const mod = require("./dist/bundle.js");
const app = mod.default || mod;
module.exports = (req, res) => app(req, res);
