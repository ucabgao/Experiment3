"use strict";

var StringMap = require('stringmap');

var cleanupURLs = require('../common/cleanupURLs');

// JSON database models
var Users = require('./models/Users');
var Territoires = require('./models/Territoires');
var Queries = require('./models/Queries');
var Oracles = require('./models/Oracles');
var OracleCredentials = require('./models/OracleCredentials');
var QueryResults = require('./models/QueryResults');

var databaseP = require('../postgresDB/databaseClientP');
var declarations = require('../postgresDB/declarations.js');

// PostGREs models
var Expressions = require('../postgresDB/Expressions');
var Resources = require('../postgresDB/Resources');
var isValidResourceExpression = Resources.isValidResourceExpression;

var Links = require('../postgresDB/Links');
var GetExpressionTasks = require('../postgresDB/GetExpressionTasks');
var AlexaRankCache = require('../postgresDB/AlexaRankCache');
var Annotations = require('../postgresDB/Annotations');
var AnnotationTasks = require('../postgresDB/AnnotationTasks');


var getExpressionTasks = declarations.get_expression_tasks;


module.exports = {
    Users: Users,
    Territoires: Territoires,
    Queries: Queries,
    Oracles: Oracles,
    OracleCredentials: OracleCredentials,
    QueryResults: QueryResults,
    Expressions : Expressions,
    Links : Links,
    Resources: Resources,
    AlexaRankCache: AlexaRankCache,
    GetExpressionTasks: GetExpressionTasks,
    Annotations: Annotations,
    AnnotationTasks: AnnotationTasks,
    
    clearAll: function(){
        var self = this;
        
        var deleteAllFunctions = Object.keys(self)
            .map(function(k){
                if(typeof self[k].deleteAll === 'function')
                    return self[k].deleteAll.bind(self[k]);
            })
            .filter(function(v){ return !!v; });

        return Promise.all(deleteAllFunctions.map(function(f){ return f(); }));
    },
    
    complexQueries: {
        getUserInitData: function(userId){
            var userP = Users.findById(userId);
            var relevantTerritoiresP = Territoires.findByCreatedBy(userId);
            var oraclesP = Oracles.getAll();
            
            return Promise.all([userP, relevantTerritoiresP, oraclesP]).then(function(res){
                var user = res[0];
                var relevantTerritoires = res[1];
                var oracles = res[2].map(function(o){ delete o.oracleNodeModuleName; return o; });
                
                var territoiresReadyPs = relevantTerritoires.map(function(t){
                    return Queries.findByBelongsTo(t.id).then(function(queries){
                        t.queries = queries;
                    });
                });
                
                user.territoires = relevantTerritoires;
                user.pictureURL = user.google_pictureURL;
                
                return Promise.all(territoiresReadyPs).then(function(){
                    return {
                        user: user,
                        oracles: oracles
                    };
                });
            });
        },
        
        getProgressIndicators: function(territoireId){
            var queryResultsP = this.getTerritoireQueryResults(territoireId);
            var crawlTodoCountP = this.getCrawlTodoCount(territoireId);
            
            return Promise.all([ queryResultsP, crawlTodoCountP ]).then(function(res){
                return {
                    queriesResultsCount: res[0].size,
                    crawlTodoCount: res[1]
                }
            });
        },
        
        
        /*
            graph is an abstract graph
        */
        getGraphAnnotations: function getGraphAnnotations(graph, territoireId){            
            var annotationByResourceId = Object.create(null);

            var resourceIds = new Set();
            
            graph.nodes.forEach(function(node){
                resourceIds.add(node.id);
            });
            
            return resourceIds.size > 0 ? 
                Annotations.findLatestByResourceIdsAndTerritoireId(resourceIds, territoireId)
                    .then(function(annotations){
                        annotations.forEach(function(ann){                        
                            annotationByResourceId[ann.resource_id] = JSON.parse(ann.values);
                        });

                        return annotationByResourceId;
                    }) : 
                Promise.resolve(annotationByResourceId);
        },
        
        /*
            rootURIs: Set<url>
            notApprovedResourceIds: Set<ResourceId>
            @returns an abstract graph
            Nodes are url => (partial) expression 
            Edges are {source: Node, target: Node}
        */
        getGraphFromRootURIs: function(rootURIs, resourceIdBlackList){
            //console.time('getGraphFromRootURIs');
            //var PERIPHERIC_DEPTH = 10000;
            
            console.log('getGraphFromRootURIs', rootURIs.size, resourceIdBlackList.size);
            
            var nodes = new StringMap/*<ResourceIdStr, resource>*/(); // these are only canonical urls
            var edges = new Set();
            
            // (alias => canonical ResourceId) map
            var aliasToCanonicalResourceId = new StringMap/*<ResourceIdStr, ResourceIdStr>*/();

            function buildGraph(resourceIds, depth){
                //console.time('buildGraph '+resourceIds.size);
                
                //var k = 'findValidByIds '+resourceIds.size;
                //console.time(k);
                return Resources.findValidByIds(resourceIds).then(function(resources){
                    //console.timeEnd(k);
                    
                    // create nodes for non-alias
                    resources.forEach(function(res){
                        if(res.alias_of !== null)
                            return;
                        
                        var idKey = String(res.id);
                        
                        nodes.set(idKey, Object.assign({
                            depth: depth
                        }, res));
                    });
                    
                    
                    // find which resource have an expression 
                    var resourcesWithExpression = resources.filter(function(r){
                        return r.expression_id !== null;
                    });
                    //console.log('resourcesWithExpression', resourcesWithExpression.length, '/', resources.length);

                    // find which resource are an alias
                    var aliasResources = resources.filter(function(r){
                        return r.alias_of !== null;
                    });
                    var aliasTargetIds = new Set(aliasResources
                        .map(function(r){
                            aliasToCanonicalResourceId.set(String(r.id), String(r.alias_of));
                            return r.alias_of;
                        })
                        .filter(function(rid){
                            return !resourceIdBlackList.has(rid);
                        })
                    );
                    var aliasRetryBuildGraphP = aliasTargetIds.size >= 1 ?
                        buildGraph(aliasTargetIds, depth) : // same depth on purpose
                        Promise.resolve();
                    
                    //console.time('Links.findBySources '+resourceIds.size);
                    var nextDepthGraphP = Links.findBySources(new Set(resourcesWithExpression.map(function(r){
                        return r.id;
                    })))
                        .then(function(links){
                            //console.timeEnd('Links.findBySources '+resourceIds.size);
                            var nextResourceIds = new Set();

                            links.forEach(function(l){
                                var targetIdStr = String(l.target);

                                if(!nodes.has(targetIdStr) && 
                                   !aliasToCanonicalResourceId.has(targetIdStr) && 
                                   !resourceIdBlackList.has(l.target))
                                {
                                    nextResourceIds.add(l.target);
                                }

                                edges.add({
                                    source: String(l.source),
                                    target: targetIdStr
                                });
                            });

                            if(nextResourceIds.size >= 1)
                                return buildGraph(nextResourceIds, depth+1);
                        });
                    
                    var resP = Promise.all([aliasRetryBuildGraphP, nextDepthGraphP])
                    //resP.then(console.timeEnd.bind(console, 'buildGraph '+resourceIds.size));
                    
                    return resP;
                });
            }
            
            return Resources.findValidByURLs(rootURIs).then(function(resources){
                var ids = new Set( resources
                    .map(function(r){ return r.id; }) 
                    .filter(function(id){ return !resourceIdBlackList.has(id) })
                );
                
                console.log('getGraphFromRootURIs ids', ids.size);
                
                return buildGraph(ids, 0).then(function(){
                    // edges may contain non-canonical URLs in the target because of how it's built. Converting before returning
                    edges.forEach(function(e){
                        e.target = Number(aliasToCanonicalResourceId.get(e.target) || e.target);
                        e.source = Number(e.source);
                    });

                    //console.timeEnd('getGraphFromRootURIs');
                    return {
                        nodes: nodes,
                        edges: edges,
                        toJSON: function(){
                            return {
                                nodes: nodes.values(),
                                edges: edges
                            }
                        }
                    };
                })
            });  
        },
        
        /*
            urls is a Set<url>
        */
        getValidTerritoireQueryResultResources: function(territoireId){
            var resources = declarations.resources;
            var annotations = declarations.annotations;
            
            return this.getTerritoireQueryResults(territoireId)
                .then(function(urls){// throw 'TODO remove those with an annotation === false' )
            
                //.then(database.Resources.findValidByURLs)
                    return databaseP.then(function(db){
                        var query = resources
                            .select(resources.star())
                            .from(
                                resources
                                    .join(annotations)
                                    .on(resources.id.equals(annotations.resource_id))
                            )
                            .where(
                                annotations.territoire_id.equals(territoireId).and(
                                    annotations.approved.equals(true).and(
                                        resources.url.in(urls.toJSON()).and(
                                            isValidResourceExpression
                                        )
                                    )
                                )
                            )
                            .toQuery();

                        //console.log('Resources findValidByURLs query', query);

                        return new Promise(function(resolve, reject){
                            db.query(query, function(err, result){
                                if(err) reject(err); else resolve(result.rows);
                            });
                        });
                    })
                })
            
        },
        
        getTerritoireQueryResults: function(territoireId){
            
            return Queries.findByBelongsTo(territoireId)
                .then(function(queries){
                    return Promise.all(queries.map(function(q){
                        return QueryResults.findLatestByQueryId(q.id);
                    }));
                })
                .then(function(queriesResults){
                    var terrResults = [];
                
                    queriesResults.forEach(function(qRes){
                        terrResults = terrResults.concat(qRes ?
                            // cleanup the results before returning them as they may contain relative links or non-http links
                            cleanupURLs(qRes.results) : 
                            []
                        );
                    });
                
                    return new Set(terrResults);
                });
        }, 
        
        getTerritoireGraph: function(territoireId){
            console.log('getTerritoireGraph', territoireId);
            
            var self = this;
            
            return Promise.all([
                this.getTerritoireQueryResults(territoireId),
                Annotations.findNotApproved(territoireId)
            ]).then(function(res){
                var roots = res[0];
                var notApprovedAnnotations = res[1];
                
                return self.getGraphFromRootURIs(
                    roots, 
                    new Set(notApprovedAnnotations.map(function(ann){ return ann.resource_id; }))
                );
            });
        },
        
        getCrawlTodoCount: function(territoireId){
            
            var self = this;
            
            return databaseP.then(function(db){
                
                var queryByTerritoireId = getExpressionTasks
                    .select( getExpressionTasks.resource_id )
                    .from(getExpressionTasks)
                    .where(getExpressionTasks.territoire_id.equal(territoireId))
                    .toQuery();
                
                
                var tasksForTerritoireIdP = new Promise(function(resolve, reject){
                    db.query(queryByTerritoireId, function(err, result){
                        if(err) reject(err); else resolve( result.rows );
                    });
                });
                
                var tasksForQueryResultsP = self.getTerritoireQueryResults(territoireId)
                    .then(function(urls){
                        return Resources.findByURLs(urls)
                            .then(function(resources){
                                return resources.map(function(r){ return r.id });
                            });
                    })
                    .then(function(resourceIds){
                        var queryByQueryResults = getExpressionTasks
                            .select( getExpressionTasks.resource_id )
                            .from(getExpressionTasks)
                            .where(getExpressionTasks.resource_id.in(resourceIds))
                            .toQuery();
                        
                        return new Promise(function(resolve, reject){
                            db.query(queryByQueryResults, function(err, result){
                                if(err) reject(err); else resolve( result.rows );
                            });
                        });
                    });
                
                
                return Promise.all([ tasksForTerritoireIdP, tasksForQueryResultsP ])
                    .then(function(res){
                        var rids0 = res[0].map(function(t){ return t.resource_id});
                        var rids1 = res[1].map(function(t){ return t.resource_id});
                    
                        var uniqueTaskIds = new Set(rids0.concat(rids1));
                    
                        return uniqueTaskIds.size;
                    })
                
            });
            
        }
        
    }
            
};
