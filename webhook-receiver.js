const http = require('http');
const { exec } = require('child_process');
const path = require('path');

const PORT = 3456;
const REPO_PATH = 'C:\\Users\\mkwin\\Desktop\\Property Flow';

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook/pull') {
    console.log(`[${new Date().toISOString()}] Webhook received, pulling latest changes...`);
    
    // Execute git pull
    exec('git pull', { cwd: REPO_PATH }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[${new Date().toISOString()}] Error pulling: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: error.message }));
        return;
      }
      
      console.log(`[${new Date().toISOString()}] Pull successful`);
      console.log(stdout);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'success', message: 'Repository pulled successfully' }));
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`\n🚀 Webhook receiver listening on http://192.168.1.245:${PORT}`);
  console.log(`Repository path: ${REPO_PATH}\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down webhook receiver...');
  server.close();
  process.exit(0);
});
