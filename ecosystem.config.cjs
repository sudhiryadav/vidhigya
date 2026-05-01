const path = require("path");

const REPO_DIR = process.env.REPO_DIR || "/home/ubuntu/prod/vidhigya";
/** Prefer nvm/CI-selected Node when deploy sets PM2_NODE_INTERPRETER (Node >=20). */
const NODE_INTERPRETER = process.env.PM2_NODE_INTERPRETER || "node";

module.exports = {
  apps: [
    {
      name: "vidhigya-backend",
      cwd: path.join(REPO_DIR, "apps/backend"),
      script: "dist/src/main.js",
      interpreter: NODE_INTERPRETER,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "vidhigya-frontend",
      cwd: path.join(REPO_DIR, "apps/web"),
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: NODE_INTERPRETER,
      env: {
        NODE_ENV: "production",
        PORT: "3888",
      },
    },
  ],
};
