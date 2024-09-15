
const socket = require("socket.io-client")("http://cjp.clidev.xyz:7001");

socket.on('connect', () => {
  console.log('Connect!')
  socket.emit('chat', 'hello world')
})

socket.on('res', (msg) => {
  console.log('Received message:', msg)
})

module.exports = socket