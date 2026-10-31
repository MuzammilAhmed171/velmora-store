// Vercel Services entrypoint (exists in git, so validation passes).
// At runtime, dist/ exists (created by buildCommand), load the compiled server.
process.env.VELMORA_SERVICE_MODE = "1";
module.exports = require("./dist/index.js");
