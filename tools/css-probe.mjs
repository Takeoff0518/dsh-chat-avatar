import fs from 'node:fs'

const file = process.argv[2]
const text = fs.readFileSync(file, 'utf8')
/** Pull the CSS bodies out of `const css$N = "..."` assignments. */
const blocks = []
const re = /const css\$\d+ = "((?:[^"\\]|\\.)*)"/g
let match
while ((match = re.exec(text)) !== null) {
  blocks.push(JSON.parse(`"${match[1]}"`))
}
console.log('blocks:', blocks.length)
const all = blocks.join('\n')
fs.writeFileSync(process.argv[3], all)

/** Report every rule that sets border-radius on a pseudo-element or on the flow row. */
const rules = all.match(/[^{}]+\{[^{}]*\}/g) ?? []
const hits = rules.filter(
  (rule) =>
    /border-radius/.test(rule) &&
    /(::before|::after|flowItem|userRow|assistantStep|_bubble)/.test(rule.split('{')[0] ?? ''),
)
console.log('hits:', hits.length)
for (const hit of hits.slice(0, 40)) console.log('---', hit.replace(/\s+/g, ' ').slice(0, 300))
