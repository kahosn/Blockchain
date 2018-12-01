const sha256 = require('sha256')
const uuid = require('uuid/v1')
const port = process.argv[2]
const currentNodeUrl = `${process.argv[3]}:${port}`

function Blockchain(){
    this.hashCondition = '0000'
    this.genesisHash = `${hashCondition}GENESIS`
    this.chain = []
    this.pendingTransactions = []
    this.currentNodeUrl = currentNodeUrl
    this.networkNodes = []
    this.createNewBlock(1, genesisHash, genesisHash)
}

Blockchain.prototype.createNewBlock = function(nonce, previousBlockHash, hash){
    const newBlock = {
        index:this.chain.length + 1,
        timestamp:Date.now(),
        transactions:this.pendingTransactions,
        nonce:nonce,
        hash:hash,
        previousBlockHash:previousBlockHash
    }
    this.pendingTransactions = []
    this.chain.push(newBlock)
    return newBlock
}

Blockchain.prototype.getLastBlock = function(){
    return this.chain[this.chain.length - 1]
}

Blockchain.prototype.createNewTransaction = function(amount, sender, recipient){
    const newTransaction = {
        amount:amount,
        sender:sender,
        recipient:recipient,
        transactionId: uuid().split('-').join('')
    }
    return newTransaction
}

Blockchain.prototype.addTransactionAsPending = function(transaction){
    this.pendingTransactions.push(transaction)
    return this.getLastBlock()['index'] + 1
}

Blockchain.prototype.hashBlock = function(previousBlockHash, currentBlockData, nonce){
    const dataString = previousBlockHash + nonce.toString() + JSON.stringify(currentBlockData)
    const hash = sha256(dataString)
    return hash
}

Blockchain.prototype.proofOfWork = function(previousBlockHash, currentBlockData){
    let nonce = 0
    let hash = this.hashBlock(previousBlockHash, currentBlockData, nonce)
    while(hash.substring(0, 4) !== Blockchain.hashCondition){
        nonce++
        hash = this.hashBlock(previousBlockHash, currentBlockData, nonce)
    }
    return nonce
}

Blockchain.prototype.chainIsValid = function(blockchain){
    let validChain = false
    for(var i = 1; i<blockchain.length; i++){
        const currentBlock = blockchain[i]
        const prevBlock = blockchain[i-1]
        const blockHash = this.hashBlock(prevBlock['hash'], {transactions:currentBlock['transactions'], index:currentBlock['index']}, currentBlock['nonce'])
        validChain = (blockHash.substring(0, 4) === Blockchain.hashCondition) && (currentBlock['previousBlockHash'] === prevBlock['hash']) 
        if(!validChain) 
            return validChain
    }
    const genesisBlock = blockchain[0];
    const correctNonce = genesisBlock['nonce'] === 1;
    const correctPreviousBlockHash = genesisBlock['previousBlockHash'] === Blockchain.genesisHash;
    const correctHash = genesisBlock['hash'] === Blockchain.genesisHash;
    const correctTransactions = genesisBlock['transactions'].length === 0;
    return  correctNonce &&
            correctPreviousBlockHash &&
            correctHash &&
            correctTransactions
}

Blockchain.prototype.getBlock = function(hash){
    let correctBlock = null
    this.chain.forEach(block=>{
        if(block.hash === hash)
            correctBlock = block
    })
    return correctBlock
}

Blockchain.prototype.getTransaction = function(id){
    let correctTransaction = null
    let correctBlock = null
    this.chain.forEach(block=>{
        block.transactions.forEach(transaction=>{
            if(transaction.transactionId === id){
                correctTransaction = transaction
                correctBlock = block
            }
        })        
    })
    return {transaction:correctTransaction, block:correctBlock}
}

Blockchain.prototype.getAddressData = function(address){
    const addressTransactions = []
    this.chain.forEach(block=>{
        block.transactions.forEach(transaction=>{
            if(transaction.sender === address || transaction.recipient === address)
                addressTransactions.push(transaction)
        })        
    })
    let balance = 0
    addressTransactions.forEach(transaction=>{
        if(transaction.recipient === address)
            balance += transaction.amount
        else
            balance -= transaction.amount
    })
    return {addressTransactions:addressTransactions, addressBalance:balance}
}

module.exports = Blockchain