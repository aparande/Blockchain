var express = require('express');
var bodyParser = require('body-parser');
var uuid = require('uuid/v4');

var blockchain = require("./blockchain");

var app = express();

app.use(bodyParser.urlencoded({
	extended:true
}));

app.use(bodyParser.json());

//Create a unique id for the user
var id = uuid().replace("-", "");

app.post("/nodes/register", function(request, response) {
  var nodes = request.body.nodes;
  if (nodes == undefined) {
    response.writeHead(400, "Supply a list of nodes");
    response.end();
    return;
  }
  console.log(nodes);
  for (var x in nodes) {
    blockchain.register_node(nodes[x])
  }

  response.send({
    "message": "New nodes have been added",
    "total_nodes": Array.from(blockchain.nodes)
  })
});

app.post("/transactions/new", function(request, response) {
  var sender = request.body.sender;
  var recipient = request.body.recipient;
  var amount = request.body.amount;

  //If the required information is missing, send an error header
  if (sender == undefined || recipient == undefined || amount == undefined) {
    response.writeHead(400, "Missing required values");
    response.end();
    return;
  }

  var index = blockchain.new_transaction(sender, recipient, amount);

  response.send({
    "message": "Transaction will be added to block "+index
  });
});

app.get("/nodes/resolve", function(request, response) {
  blockchain.resolve_conflicts(function(result) {
    if (result) {
      response.send({
        "Message":"Local chain was updated",
        "New_Chain":blockchain.chain
      });
      return;
    } else {
      response.send({
        "Message":"Local chain is the best",
        "chain": blockchain.chain
      })
    }
  });
});

app.get("/mine", function(request, response) {
  var last_block = blockchain.last_block();
  var last_proof = last_block.proof;
  //Get the new proof for the next block
  proof = blockchain.proof_of_work(last_proof);
  //Give the miner a reward for mining
  blockchain.new_transaction("0", id, 1);

  //Hash the previous block
  var previous_hash = blockchain.hash(last_block);
  //Add the new block to the chain
  var block = blockchain.new_block(proof, previous_hash);

  response.send({
    "message": "New Block Forged",
    "block": block
  });
});

app.get("/chain", function(request, response) {
  response.send({
    "chain": blockchain.chain,
    "length": blockchain.chain.length
  });
});

app.get('*', function(request, response) {
	response.redirect("/chain");
});

app.listen(process.env.PORT || 4001, function() {
	console.log('Express server listening on port %d', this.address().port);
});
