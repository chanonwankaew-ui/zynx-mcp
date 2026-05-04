module.exports = {
  apps: [
    {
      name: 'zynx-backend',
      script: './dist/backend.js',
      env: {
        NODE_ENV: 'production',
        // In Cloud Run, we might want to run the backend on a different internal port 
        // if the MCP server is the primary entry point, or vice-versa.
        // For a platform, we often use a reverse proxy or run them as separate services.
        // Here we run both in one container for simplicity in early PaaS stage.
        PORT: 8787 
      }
    },
    {
      name: 'zynx-mcp-sse',
      script: './dist/http.js',
      env: {
        NODE_ENV: 'production',
        // Cloud Run provides the PORT env var for the main entry point.
        PORT: process.env.PORT || 3000
      }
    }
  ]
};
