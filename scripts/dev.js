const { spawn } = require('child_process')
const os = require('os')

const port = process.env.PORT || 3000
const useHttps = process.argv.includes('--https')
const protocol = useHttps ? 'https' : 'http'

const nets = os.networkInterfaces()
const ips = []
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ips.push({ name, address: net.address })
    }
  }
}

console.log('')
console.log(`  \x1b[1m\x1b[36m${useHttps ? 'HTTPS Dev Server' : 'Dev Server'}\x1b[0m`)
console.log(`  Local:   \x1b[34m${protocol}://localhost:${port}\x1b[0m`)
ips.forEach(({ name, address }) => {
  console.log(`  Network: \x1b[34m${protocol}://${address}:${port}\x1b[0m  \x1b[90m(${name})\x1b[0m`)
})
console.log('')

const args = ['dev', '-H', '0.0.0.0', '-p', port]
if (useHttps) args.push('--experimental-https')

const next = spawn('next', args, {
  stdio: 'inherit',
  shell: true,
})

next.on('exit', (code) => process.exit(code))
