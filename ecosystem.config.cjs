const path = require("path");

const REPO_DIR = process.env.REPO_DIR || "/home/ubuntu/prod/vidhigya";

module.exports = {
  apps: [
    {
      name: "vidhigya-backend",
      cwd: path.join(REPO_DIR, "apps/backend"),
      script: "dist/src/main.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "vidhigya-frontend",
      cwd: path.join(REPO_DIR, "apps/web"),
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
