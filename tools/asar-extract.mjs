import fs from 'node:fs'
import path from 'node:path'

process.noAsar = true
const asarPath = process.argv[2]
const outRoot = process.argv[3]
const only = process.argv.slice(4)

const fd = fs.openSync(asarPath, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const headerBuf = Buffer.alloc(headerSize)
fs.readSync(fd, headerBuf, 0, headerSize, 16)
const header = JSON.parse(headerBuf.toString('utf8').replace(/\0+$/, ''))
const baseOffset = 16 + headerSize

const files = []
function walk(node, prefix) {
  for (const [name, entry] of Object.entries(node.files)) {
    const p = prefix + '/' + name
    if (entry.files) walk(entry, p)
    else files.push({ path: p, size: entry.size, offset: baseOffset + Number(entry.offset), unpacked: entry.unpacked })
  }
}
walk(header, '')

let n = 0
for (const f of files) {
  if (!only.some((o) => f.path.startsWith(o))) continue
  const dest = path.join(outRoot, f.path)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  if (f.unpacked) {
    fs.writeFileSync(dest, '')
    continue
  }
  const buf = Buffer.alloc(f.size)
  if (f.size) fs.readSync(fd, buf, 0, f.size, f.offset)
  fs.writeFileSync(dest, buf)
  n++
}
console.log('extracted', n)
