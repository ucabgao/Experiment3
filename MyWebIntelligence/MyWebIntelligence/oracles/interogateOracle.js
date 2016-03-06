"use strict";

var resolve = require('path').resolve;

var database = require('../database');
var oraclesInitData = require('./oracleDescriptions.json');
var oracleModules = new Map();

var oraclesReadyP = Promise.all(oraclesInitData.map(function(o){
    var modulePath = resolve(__dirname, o.oracleNodeModuleName);
    
    // will throw if there is no corresponding module and that's on purpose
    oracleModules.set(o.oracleNodeModuleName, require(modulePath));
    
    // check if entry with oracleNodeModuleName exists. If not, create it.
    // by oracleNodeModuleName because names may be localized in the future. Module names likely won't ever.
    return database.Oracles.findByOracleNodeModuleName(o.oracleNodeModuleName).then(function(result){
        if(!result)
            return database.Oracles.create(o);
        // else an entry exist, nothing to do.
    });
}));


oraclesReadyP.catch(function(err){
    console.error("oracles error", err);
    process.kill();
});

module.exports = function(oracle, q, oracleOptions, credentials){
    console.log('Interogate oracle', oracle, q, oracleOptions, credentials);
    
    return oraclesReadyP.then(function(){
        var oracleFunction = oracle.needsCredentials ?
            oracleModules.get(oracle.oracleNodeModuleName)(credentials) :
            oracleModules.get(oracle.oracleNodeModuleName);
        
        return oracleFunction(q, oracleOptions).then(function(searchResults){
            console.log('oracle results for', q, searchResults.size);
            return searchResults;
        });
    });
};
