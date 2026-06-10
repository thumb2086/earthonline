const fs = require('fs');
let c = fs.readFileSync('../client/src/App.jsx', 'utf8');
c = c.replace("const { lifespan, sessionTime } = useTimer(myNode, socket, region);\n  ", '');
c = c.replace(/const \[logs, setLogs\] = useState\(\[[\s\S]*?\];\n\n  /, '');
c = c.replace(/const addLog = \(msg, extra = \{\}\) => \{[\s\S]*?\n  };\n\n  /, '');
fs.writeFileSync('../client/src/App.jsx', c, 'utf8');
console.log('OK');
