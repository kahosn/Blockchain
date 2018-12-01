const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const Blockchain = require('./blockchain')
const uuid = require('uuid/v1')
const reqPrm = require('request-promise')

const port = process.argv[2]
const nodeAddress = uuid().split('-').join('')
const bitcoin = new Blockchain()
const SYSTEM = 'SYSTEM'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))

app.get('/', function(req, res){
    res.send('hello')
})

app.get('/blockchain', function(req, res){
    res.send(bitcoin)
})

app.get('/consensus', function(req, res){
    const promises = []
    bitcoin.networkNodes.forEach(url=>{
        const reqOptions = {
            uri:url + '/blockchain',
            method:'GET',
            json:true
        }
        promises.push(reqPrm(reqOptions))
    })
    Promise.all(promises)
    .then(blockchains=>{
        const currentChainLength = bitcoin.chain.length
        let maxChainLength = currentChainLength
        let newLongestChain = null
        let newPendingTransactions = null
        blockchains.forEach(blockchain=>{
            if(blockchain.chain.length>maxChainLength){
                maxChainLength = blockchain.chain.length
                newLongestChain = blockchain.chain
                newPendingTransactions = blockchain.pendingTransactions
            }
        })
        if(!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))){
            res.json({
                note:'Current chain has not been replaced',
                chain:bitcoin.chain
            })
        }
        else {
            bitcoin.chain = newLongestChain
            bitcoin.pendingTransactions = newPendingTransactions
            res.json({
                note:'Current chain is replaced',
                chain:bitcoin.chain
            })
        }
    })
})

app.post('/transaction/broadcast', function(req, res){
    const transaction = bitcoin.createNewTransaction(req.body.amount, req.body.sender, req.body.recipient)
    bitcoin.addTransactionAsPending(transaction)
    const promises = []
    bitcoin.networkNodes.forEach(url=>{
        const reqOptions = {
            uri:url + '/transaction',
            method:'POST',
            body:transaction,
            json:true
        }
        promises.push(reqPrm(reqOptions))
    })
    Promise.all(promises)
    .then(data=>{
        res.json({note:'Transaction created and broadcasted!'})
    })
})

app.post('/transaction', function(req, res){
    const transaction = req.body
    const blockIndex = bitcoin.addTransactionAsPending(transaction)
    res.json({note:`Transaction is pending on this node, will be added to block ${blockIndex}`})
})

app.get('/mine', function(req, res){
    const lastBlock = bitcoin.getLastBlock()
    const prevBlockHash = lastBlock['hash']
    const currentBlockData = {
        transactions: bitcoin.pendingTransactions,
        index: lastBlock['index'] + 1
    }
    const nonce = bitcoin.proofOfWork(prevBlockHash, currentBlockData)
    const hash = bitcoin.hashBlock(prevBlockHash, currentBlockData, nonce)
    const newBlock = bitcoin.createNewBlock(nonce, prevBlockHash, hash)
    const promises = []
    bitcoin.networkNodes.forEach(url=>{
        const reqOptions = {
            uri:url + '/receive-new-block',
            method:'POST',
            body:{newBlock:newBlock},
            json:true
        }
        promises.push(reqPrm(reqOptions))
    })
    Promise.all(promises)
    .then(data=>{
        const reqOptions = {
            uri:bitcoin.currentNodeUrl +'/transaction/broadcast',
            method:'POST',
            body:blockchain.createNewTransaction(12.5, SYSTEM, nodeAddress),
            json:true
        }
        return reqPrm(reqOptions)
    })
    .then(data=>{
        res.json({note:"Block mined and broadcasted!", block:newBlock})
    })
})

app.post('/receive-new-block', function(req, res){
    const newBlock = req.body.newBlock
    const lastBlock = bitcoin.getLastBlock()
    const correctHash = lastBlock.hash === newBlock.previousBlockHash
    const correctIndex = lastBlock['index'] + 1 === newBlock['index']
    if(correctHash && correctIndex){
        bitcoin.chain.push(newBlock)
        bitcoin.pendingTransactions = []
        res.json({note:'New Block Added!', newBlock:newBlock})
    }
    else
        res.json({note:'New Block Rejected!', newBlock:newBlock})
})

app.post('/register-broadcast-node', function(req, res){
    const newNodeUrl = req.body.newNodeUrl
    const promises = []
    registerNode(newNodeUrl)
    bitcoin.networkNodes.forEach(url=>{
        const reqOptions = {
            uri:url +'/register-node',
            method:'POST',
            body:{newNodeUrl:newNodeUrl},
            json:true
        }
        promises.push(reqPrm(reqOptions))
    })    
    Promise.all(promises)
    .then(data=>{
        const bulkOptions = {
            uri:newNodeUrl +'/register-nodes',
            method:'POST',
            body:{networkNodes:[...bitcoin.networkNodes, bitcoin.currentNodeUrl]},
            json:true
        }
        return reqPrm(bulkOptions)
    })
    .then(data=>{
        res.json({note:'New Node Registered In Newtork!'})
    })
})

app.post('/register-node', function(req, res){
    const newNodeUrl = req.body.newNodeUrl
    registerNode(newNodeUrl)
    res.json({note:'New Node Registered!'})
})

app.post('/register-nodes', function(req, res){
    const networkNodes = req.body.networkNodes
    networkNodes.forEach(url=>{
        registerNode(url)
    })
    res.json({note:'Nodes Registered!'})
})

const registerNode = (url)=>{
    if(!nodeUrlExists(url) && url !== bitcoin.currentNodeUrl)
        bitcoin.networkNodes.push(url)
}

const nodeUrlExists = (url)=>{
    return (bitcoin.networkNodes.indexOf(url)>-1)
}

app.get('/block/:hash', function(req, res){
    const hash = req.params.hash
    const block = bitcoin.getBlock(hash)
    res.json({
        block:block
    })
})

app.get('/transaction/:id', function(req, res){
    const id = req.params.id
    const Transblock = bitcoin.getTransaction(id)
    res.json({
        block:Transblock.block,
        transaction:Transblock.transaction
    })
})

app.get('/address/:address', function(req, res){
    const address = req.params.address
    const data = bitcoin.getAddressData(address)
    res.json({
        balance:data.addressBalance,
        addressData:data
    })
})

app.get('/block-explorer', function(req, res){
    res.sendFile('./block-explorer/index.html', {root:__dirname})
})

app.listen(port, function(){
    console.log(`Listening on port ${port}`)
})