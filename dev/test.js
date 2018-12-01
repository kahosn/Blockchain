const Blockchain = require('./blockchain')
const bitcoin = new Blockchain()

const previousBlockHash= 'KJKJKFJSKDKHHEWK'
const currentBlockData = [
    {
        amount:10,
        sender:'ALEX89898',
        recipient:'JONES889549'
    },
    {
        amount:100,
        sender:'ALEX89898',
        recipient:'JONES889549'
    },
    {
        amount:20,
        sender:'ALEX89898',
        recipient:'JONES889549'
    }
]

const nonce = bitcoin.proofOfWork(previousBlockHash, currentBlockData)
bitcoin.hashBlock(previousBlockHash, currentBlockData, nonce)

console.log(bitcoin)