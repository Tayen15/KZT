require('child_process').spawn('node', ['server.js'], { stdio: 'inherit' });
require('./index.js');
