#!/usr/bin/env node

(async () => {
  const fs = require('fs')
  const lines = fs.readFileSync('index.html', 'utf-8').split('\n')

  let tagName
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/href="(?!GitForWindows\.css|mailto:)(Git-(.*)-64-bit\.exe|[^"\/]+)"/)
    if (!match) continue
    if (match[2]) tagName = match[2]
    lines[i] = lines[i].replace(
      /href="([^"\/]+)"/g,
      `href="https://github.com/git-for-windows/git-snapshots/releases/download/${tagName}/$1"`
    )
  }

  fs.writeFileSync('index.html', lines.join('\n'))
})().catch(e => {
  console.error(e)
  process.exit(1)
})
