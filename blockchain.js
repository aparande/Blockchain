"use strict";
var hasher = require('node-object-hash');
var time = require('unix-timestamp');
var url = require('url');
var request = require('request');

class Blockchain {
  constructor() {
    this.chain = [];
    this.current_transactions = []
    this.nodes = new Set();

    this.new_block(1, 100);
  }

  new_block(proof, previous_hash) {
    var block = {
      'index': this.chain.length,
      'timestamp': time.now(),
      'transactions': this.current_transactions,
      'proof': proof,
      'previous_hash': (previous_hash == undefined) ? this.hash(this.chain[this.chain.length - 1]) : previous_hash
    };

    //Reset the current list of transactions before pushing onto the chain
    this.current_transactions = [];

    this.chain.push(block);

    return block
  }

  new_transaction(sender, recipient, amount) {
    this.current_transactions.push({
      'sender':sender,
      'recipient':recipient,
      'amount':amount
    });

    return this.last_block().index + 1;
  }
  //Determines whether or not a chain is valid
  valid_chain(chain) {
    //Iterate through all the blocks in the new chain. For each block, check that its proof of work and hashes are correct
    var last_block = chain[0];
    var current_index = 1;
    while (current_index < chain.length) {
      var block = chain[current_index];
      //Check if the block's has is correct
      if (block.previous_hash != this.hash(last_block))
        return false;
      //Check that the Proof of Work is correct
      if (!this.valid_proof(last_block.proof, block.proof))
        return false;

      last_block = block;
      current_index += 1;
    }

    return true;
  }

  //Reach consensus between different chains with the longest one in the network
  resolve_conflicts(result) {
    var self = this;

    var max_length = this.chain.length;
    var new_chain = undefined;
    var found_longer_chain = false;

    var nodes_expanded = 0;
    var callback = function() {
      nodes_expanded++;
      if (nodes_expanded == stored_nodes.length) {
        //Replace the current chain with the new one if it is discovered. Otherwise it just keeps it the same
        if (found_longer_chain) {
          //console.log(new_chain);
          self.chain = new_chain;
          result(true);
          return;
        }
        result(false);
      }
    }

    var stored_nodes = Array.from(this.nodes);
    for (var x in stored_nodes) {
      var node_loc = "http://"+stored_nodes[x]+"/chain";
      request(node_loc, function(error, response, body) {
        if (response.statusCode == 200) {
          var json = JSON.parse(body);
          var length = json.length;
          var chain = json.chain;
          //The longest chain is the right chain, so make sure any received chains are longer than the one currently marked as correct
          if (length > max_length && self.valid_chain(chain)) {
            max_length = length;
            new_chain = chain;
            found_longer_chain = true;
          }
        } else {
          console.log(error);
        }
        callback();
      });
    }
  }

  proof_of_work(last_proof) {
    //Find a number p so hash(p * p') contains 4 leading 0s, where p is the previous proof and p' is the new proof
    var proof = 0;
    while (!this.valid_proof(last_proof, proof)) {
      proof += 1;
    }

    return proof
  }

  valid_proof(last_proof, proof) {
    var guess_hash = hasher().hash(last_proof * proof);
    return guess_hash.substring(guess_hash.length-4) === "0000";
  }

  register_node(address) {
    var parsed_url = url.parse(address);
    console.log(parsed_url.host);
    this.nodes.add(parsed_url.host);
  }

  hash(block) {
    return hasher().hash(block)
  }

  last_block() {
    return this.chain[this.chain.length - 1];
  }
}

module.exports = new Blockchain();
