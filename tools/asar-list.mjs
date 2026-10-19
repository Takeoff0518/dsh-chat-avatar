import fs from 'node:fs'

process.noAsar = true
const asarPath = process.argv[2]
const fd = fs.openSync(asarPath, 'r')
const head = Buffer.alloc(16)
fs.readSync(fd, head, 0, 16, 0)
const headerSize = head.readUInt32LE(12)
const headerBuf = Buffer.alloc(headerSize)
fs.readSync(fd, headerBuf, 0, headerSize, 16)
const header = JSON.parse(headerBuf.toString('utf8').replace(/\0+$/, ''))
const baseOffset = 16 + headerSize

const out = []
function walk(node, prefix) {
  for (const [name, entry] of Object.entries(node.files)) {
    const p = prefix + '/' + name
    if (entry.files) walk(entry, p)
    else out.push({ path: p, size: entry.size, offset: baseOffset + Number(entry.offset) })
  }
}
walk(header, '')
fs.writeFileSync(process.argv[3], JSON.stringify(out, null, 1))
console.log('files:', out.length)
