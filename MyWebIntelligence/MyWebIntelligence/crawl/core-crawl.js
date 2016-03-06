"use strict";

var database = require('../database');

var approve = require('./approve');
var getExpression = require('./getExpression-scheduler');

var stripURLHash = require('../common/stripURLHash');


/*
interface Expression{
    full_html: string
    main_html: string // stipped HTML containing only the useful content
    main_text: string // textual content of 'html'
    title: string // <title> or <h1>
    meta: Map<string, string>
    links: Set<string>
    aliases: Set<string>
    meta_description: string
}

// ignoring intermediate redirects
interface FetchedDocument{
    originalURL: string
    URLAfterRedirects : string
    html: string
}
*/


/*
    urls: Set<string>
    originalWords: Set<string>
    
    @return Promise<CrawlResult> which is sort of a graph
*/
module.exports = function(initialUrls, originalWords){
    originalWords = originalWords || new Set();
    
    //console.log('crawl call', initialUrls.size, originalWords.toJSON());
    
    var todo = new Set(initialUrls.toJSON().map(stripURLHash)); // clone
    var doing = new Set();
    var done = new Set();
    // var results = new Map(); // Map<urlAfterRedirect, result>()
    
    function crawl(depth){
        //console.log('internal crawl', depth, '|', todo.size, doing.size, done.size);
        return Promise.all(todo.toJSON().map(function(u){
            todo.delete(u);
            doing.add(u);

            return getExpression(u)
                .then(function(expression){
                    //console.log('gotExpression', expression);
                
                    doing.delete(u);
                    done.add(u);

                    var expressionSavedP;
                
                    var approved = approve({
                        depth: depth,
                        wordsToMatch: originalWords,
                        expression: expression
                        //citedBy: Set<URL>
                    });
                
                    if(approved){
                        // save the expression only if it's approved
                        // expression may come from db or may be new or changed (added alias)
                        if(!expression._dontSave){ // save here
                            if('created_at' in expression)
                                expressionSavedP = database.Expressions.update(expression);    
                            else
                                expressionSavedP = database.Expressions.create(expression);
                        }
                        
                        //console.log('approved', u, expression);
                        expression.references.forEach(function(linkUrl){
                            if(!doing.has(linkUrl) && !done.has(linkUrl))
                                todo.add(linkUrl);
                        });
                    }
                    /*else{ // unapproved expression. Save later for
                    
                    }*/
                
                    return (expressionSavedP || Promise.resolve()).then(function(){
                        return approved;
                    });
                })
                .then(function(approved){
                    return approved && todo.size >= 1 ? crawl(depth+1) : undefined;
                })
                .catch(function(err){
                    console.error('Crawl error', u, err);
                });

        }));
    }
    
    return crawl(0).then(function(){
        /*return {
            nodes: results,
            redirects: redirects
        }*/
    });
};
