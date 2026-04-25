import 'dotenv/config';
import app from './app.js';
import os from 'os';

const PORT = process.env.PORT || 3000;

// 获取本机 IP 地址用于局域网访问
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIPAddress();
  console.log('='.repeat(50));
  console.log('VR English Vocabulary Learning Server');
  console.log('='.repeat(50));
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://${localIP}:${PORT}`);
  console.log('='.repeat(50));
  console.log('API Endpoints:');
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/learning/session`);
  console.log(`  GET  /api/learning/session/:id`);
  console.log(`  POST /api/tripo/generate`);
  console.log(`  GET  /api/tripo/task/:taskId`);
  console.log('='.repeat(50));
});
