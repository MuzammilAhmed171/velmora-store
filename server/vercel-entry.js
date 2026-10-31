// Vercel Services entrypoint (exists in git, so validation passes).
// Exports the Express app as a request handler.
const mod = require("./dist/index.js");
const app = mod.default || mod;
module.exports = (req, res) => app(req, res);
