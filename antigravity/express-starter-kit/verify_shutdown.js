const { spawn } = require('child_process');
const path = require('path');

const server = spawn('node', ['dist/server.js'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverStarted = false;
let serverClosed = false;
let dbClosed = false;

server.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('STDOUT:', output);
  if (output.includes('Listening to port') && !serverStarted) {
    serverStarted = true;
    console.log('Server started, sending SIGTERM...');
    // Give it a moment to fully initialize if needed
    setTimeout(() => {
        server.kill('SIGTERM');
    }, 1000);
  }
  if (output.includes('Server closed')) {
    serverClosed = true;
  }
  if (output.includes('MongoDB connection closed')) {
    dbClosed = true;
  }
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

server.on('close', (code) => {
  console.log(`Child process exited with code ${code}`);
  if (serverStarted && serverClosed && dbClosed) {
    console.log('Verification SUCCESS');
    process.exit(0);
  } else {
    console.error('Verification FAILED');
    console.error(`Started: ${serverStarted}, Server Closed: ${serverClosed}, DB Closed: ${dbClosed}`);
    process.exit(1);
  }
});

setTimeout(() => {
  console.error('Timeout reached');
  server.kill('SIGKILL');
  process.exit(1);
}, 15000);
