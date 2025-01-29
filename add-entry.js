#!/usr/bin/env node

const main = async (...args) => {
  const cpus = {
    '64-bit': { label: 'x64 (64-bit)', rank: 3 },
    'arm64': { label: 'ARM64', rank: 2 },
    '32-bit': { label: 'x86 (32-bit)', rank: 1 },
  }
  const urls = {
    installers: [],
    portableGits: [],
    minGits: [],
    busyBoxMinGits: []
  }
  const cpuRE = `(${Object.keys(cpus).join('|')})`
  const fileNameRegex = new RegExp(`^(?:${[
    ['Git', 'exe'],
    ['PortableGit', '7z\\.exe'],
    ['MinGit', 'zip', '-BusyBox'],
    ['MinGit', 'zip'],
  ].map(a => `(${a[0]}-.*?${a[2] || ''}-${cpuRE}\\.${a[1]})`)
    .join('|')})$`, 'i')
  const addURL = url => {
    const fileName = url.replace(/.*\//, '')
    const match = fileName.match(fileNameRegex)
    if (!match) throw new Error(`Cannot parse URL: ${url}`)
    else if (match[1]) urls.installers.push({ url, cpu: cpus[match[2]] })
    else if (match[3]) urls.portableGits.push({ url, cpu: cpus[match[4]] })
    else if (match[5]) urls.busyBoxMinGits.push({ url, cpu: cpus[match[6]] })
    else if (match[7]) urls.minGits.push({ url, cpu: cpus[match[8]] })
    else throw new Error(`Cannot parse URL: ${url}`)
  }

  let date
  let commit
  while (args.length > 0) {
    const arg = args.shift()
    if (arg.startsWith('--date=')) date = arg.replace(/.*?=/, '')
    else if (arg.startsWith('--commit=')) commit = arg.replace(/.*?=/, '')
    else if (arg.startsWith('https://')) addURL(arg)
    else {
      throw new Error(`Unhandled argument '${arg}`)
    }
  }

  if (!date) throw new Error('Need a date!')
  if (!commit) throw new Error('Need a commit!')
  if (Object.values(urls).reduce((a, e) => e.length + a, 0) === 0) throw new Error('Need at least one URL!')

  const listURLs = array => array
    .sort((a, b) => b.cpu.rank - a.cpu.rank)
    .map((e, i) => `${i < 1 ? '' : array[i + 1] ? ', ' : ' and '}<a href="${e.url}">${e.cpu.label}</a>`)
    .join('')

  const fs = require('fs')
  const sections = fs
    .readFileSync('index.html', 'utf-8')
    .split(/(<h2 .+<\/h2>)/)
  if (sections.length < 3) throw new Error(`'index.html' is not in the expected format`)

  const existingIDs = new Set(
    sections
      .filter((e, i) => (i % 2) === 1)
      .map(e => e.replace(/^<h2 id="([^"]+).*/, '$1'))
  );
  const id = (() => {
    const stamp = new Date(date).toISOString()
    if (!existingIDs.has(stamp)) return stamp
    for (let i = 2; ; i++) {
      if (!existingIDs.has(`${stamp}-${i}`)) return `${stamp}-${i}`
    }
  })()

  const insert = [
    `<h2 id="${id}">`,
    `<a class="anchor" href="#${id}">&#128279;</a>`,
    date,
    '<br />',
    `(commit <a href="https://github.com/git-for-windows/git/commit/${commit}">${commit}</a>)</h2>\n`,
    '\n',
    '<ul>\n', ...[
      { label: 'Git for Windows installer', urls: urls.installers },
      { label: 'Portable Git (self-extracting <tt>.7z</tt> archive)', urls: urls.portableGits },
      { label: 'MinGit', urls: urls.minGits },
      { label: 'MinGit (BusyBox)', urls: urls.busyBoxMinGits },
    ].filter(e => e.urls.length > 0).map(e => `<li>${e.label}: ${listURLs(e.urls)}.</li>\n`),
    '</ul>'
  ].join('')

  sections[1] = `${insert}\n\n${sections[1]}`
  fs.writeFileSync('index.html', sections.join(''))
}

module.exports = main

if (require.main === module) main(...process.argv.slice(2)).catch(e => {
  console.error(e)
  process.exit(1)
})
