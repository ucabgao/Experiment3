"use strict";

var StringMap = require('stringmap');

var Expressions = require('../../database').Expressions;

/*
    graph is an abstract page graph
    The returned value is a dictionary object key'ed on expression_id
*/
module.exports = function(graph){
    console.time('getGraphExpressions');

    var expressionsById = Object.create(null);
    var ids = new Set();

    var expressionIdToURL = new StringMap();

    graph.nodes.forEach(function(node){
        var id = node.expression_id;
        if(id !== null){
            ids.add(id);
            expressionIdToURL.set(String(id), node.url);
        }
    });

    return ids.size > 0 ? Expressions.getExpressionsWithContent(ids).then(function(expressions){
        expressions.forEach(function(expr){
            expr.url = expressionIdToURL.get(String(expr.id));
            expressionsById[expr.id] = expr;
        });

        console.timeEnd('getGraphExpressions');
        return expressionsById;
    }) : expressionsById;
};
