module.exports = {
  apps: [
    {
      name: "vidhigya-ai-service",
      script: "/home/ubuntu/vidhigya/apps/ai-service/.venv/bin/python",
      args: " -m uvicorn main:app --host 0.0.0.0 --port 8002",
      cwd: "/home/ubuntu/vidhigya/apps/ai-service",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '4G',
      env: {
        PORT: 8002,
        NODE_ENV: "production"
      }
    }
  ]
};
