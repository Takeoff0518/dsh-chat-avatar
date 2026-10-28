import fs from 'node:fs'

const file = process.argv[2]
const needle = process.argv[3]
const before = Number(process.argv[4] ?? 220)
const after = Number(process.argv[5] ?? 420)
const text = fs.readFileSync(file, 'utf8')

let index = 0
let count = 0
while ((index = text.indexOf(needle, index)) !== -1) {
  count += 1
  const start = Math.max(0, index - before)
  console.log(`\n===== #${count} @${index} =====`)
  console.log(text.slice(start, index + after).replace(/\s+/g, ' '))
  index += needle.length
  if (count >= Number(process.argv[6] ?? 12)) break
}
console.log(`\ntotal occurrences: ${text.split(needle).length - 1}`)
