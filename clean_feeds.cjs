const fs = require('fs');

const serverFile = 'server.ts';
let code = fs.readFileSync(serverFile, 'utf8');

const failedFeeds = JSON.parse(fs.readFileSync('failed_feeds.json', 'utf8'));

// Convert the failed URLs into a Set for fast lookup
const failedSet = new Set(failedFeeds);

// We need to parse FEEDS array block and remove those lines.
const lines = code.split('\n');
const newLines = [];
let insideFeeds = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('const FEEDS = [')) {
    insideFeeds = true;
    newLines.push(line);
    continue;
  }

  if (insideFeeds && line.startsWith('];')) {
    insideFeeds = false;
    newLines.push(line);
    continue;
  }

  if (insideFeeds) {
    // Check if line contains a URL from the failed list
    const match = line.match(/url:\s*"([^"]+)"/);
    if (match) {
      const url = match[1];
      if (failedSet.has(url)) {
        // Skip this line because it failed
        continue;
      }
    }
  }

  newLines.push(line);
}

fs.writeFileSync(serverFile, String(newLines.join('\n')));
console.log('Removed failed feeds from server.ts');
