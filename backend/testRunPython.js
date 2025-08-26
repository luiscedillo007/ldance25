// testRunPython.js
const { spawn } = require('child_process');
const path = require('path');
const { serverIp, useMulticast } = require('./streamConfig');

const p = spawn('python', ['-u', path.join(__dirname, 'python_scripts', 'optitrack_stdout.py')], { stdio: ['pipe','pipe','pipe'] });
p.stdin.write(JSON.stringify({ server_ip: serverIp, use_multicast: useMulticast })); p.stdin.end();
p.stdout.on('data', d => process.stdout.write(d));   // JSON frames
p.stderr.on('data', d => process.stderr.write(d));   // status/errors
