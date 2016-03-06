// Copyright 2002-2015, University of Colorado Boulder

/**
 * View representation of a Graph. Responsible for the view of 'MyLine', 'BestFitLine'
 * and the residuals on the graph. The view of the dataPoints is handled in the main ScreenView
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Line = require( 'SCENERY/nodes/Line' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Property = require( 'AXON/Property' );
  var ResidualLineAndSquareNode = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/ResidualLineAndSquareNode' );
  var Shape = require( 'KITE/Shape' );

  /**
   *
   * @param {Graph} graph
   * @param {Bounds2} viewBounds
   * @param {ModelViewTransform2} modelViewTransform
   * @constructor
   */
  function GraphNode( graph, viewBounds, modelViewTransform ) {
    var graphNode = this;

    this.graph = graph;
    this.viewBounds = viewBounds;
    this.modelViewTransform = modelViewTransform;

    Node.call( this );

    // Create 'MyLine'
    // First, get the two points formed by the intersection of the line and the boundary of the graph
    var myLineBoundaryPoints = graph.getBoundaryPoints( graph.slope( graph.angle ), graph.intercept );
    this.myLine = new Line(
      modelViewTransform.modelToViewPosition( myLineBoundaryPoints.point1 ),
      modelViewTransform.modelToViewPosition( myLineBoundaryPoints.point2 ),
      { stroke: LSRConstants.MY_LINE_COLOR.BASE_COLOR, lineWidth: LSRConstants.LINE_WIDTH } );

    // Create 'Best Fit Line'; initially set bestFitLine to zero length and then update it
    this.bestFitLine = new Line( 0, 0, 0, 0, {
      stroke: LSRConstants.BEST_FIT_LINE_COLOR.BASE_COLOR,
      lineWidth: LSRConstants.LINE_WIDTH
    } );

    if ( graph.isLinearFitDefined() ) {
      var linearFitParameters = graph.getLinearFit();
      var bestFitLineBoundaryPoints = graph.getBoundaryPoints( linearFitParameters.slope, linearFitParameters.intercept );
      this.bestFitLine = new Line(
        modelViewTransform.modelToViewPosition( bestFitLineBoundaryPoints.point1 ),
        modelViewTransform.modelToViewPosition( bestFitLineBoundaryPoints.point2 ),
        { stroke: LSRConstants.BEST_FIT_LINE_COLOR.BASE_COLOR, lineWidth: LSRConstants.LINE_WIDTH } );
    }

    // Update 'MyLine' and update 'MyLine' Residuals upon of change of angle (a proxy for the slope), or intercept
    Property.multilink( [ graph.angleProperty, graph.interceptProperty ], function( angle, intercept ) {
      var slope = graph.slope( angle );
      updateMyLine( slope, intercept );
      graph.updateMyLineResiduals();
    } );

    // Handle the comings and goings of 'My Line' Residuals.
    graph.myLineResiduals.addItemAddedListener( function( addedResidual ) {

      // Create and add the view representation for this residual.
      var residualNode = new ResidualLineAndSquareNode(
        addedResidual,
        LSRConstants.MY_LINE_COLOR,
        graphNode.viewBounds,
        modelViewTransform,
        graph.myLineResidualsVisibleProperty,
        graph.myLineSquaredResidualsVisibleProperty );
      graphNode.addChild( residualNode );

      // Add the removal listener for if and when this residual is removed from the model.
      graph.myLineResiduals.addItemRemovedListener( function removalListener( removedResidual ) {
        if ( removedResidual === addedResidual ) {
          residualNode.dispose();
          graphNode.removeChild( residualNode );
          graph.myLineResiduals.removeItemRemovedListener( removalListener );
        }
      } );
    } );

    // Handle the comings and goings of Best Fit Line Residuals.
    graph.bestFitLineResiduals.addItemAddedListener( function( addedResidual ) {

      // Create and add the view representation for this residual.
      var residualNode = new ResidualLineAndSquareNode(
        addedResidual,
        LSRConstants.BEST_FIT_LINE_COLOR,
        graphNode.viewBounds,
        modelViewTransform,
        graph.bestFitLineResidualsVisibleProperty,
        graph.bestFitLineSquaredResidualsVisibleProperty );
      graphNode.addChild( residualNode );

      // Add the removal listener for if and when this residual is removed from the model.
      graph.bestFitLineResiduals.addItemRemovedListener( function removalListener( removedResidual ) {
        if ( removedResidual === addedResidual ) {
          residualNode.dispose();
          graphNode.removeChild( residualNode );
        }
      } );
    } );

    // Hide or show the visibility of 'MyLine' and 'BestFitLine'
    graph.myLineVisibleProperty.linkAttribute( this.myLine, 'visible' );
    graph.bestFitLineVisibleProperty.linkAttribute( this.bestFitLine, 'visible' );

    // Add the two lines to this Node
    this.addChild( this.myLine );
    this.addChild( this.bestFitLine );

    /**
     * Update 'My Line'
     * @param {number} slope
     * @param {number} intercept
     */
    function updateMyLine( slope, intercept ) {
      var boundaryPoints = graph.getBoundaryPoints( slope, intercept );
      graphNode.myLine.setPoint1( modelViewTransform.modelToViewPosition( boundaryPoints.point1 ) );
      graphNode.myLine.setPoint2( modelViewTransform.modelToViewPosition( boundaryPoints.point2 ) );
      graphNode.myLine.clipArea = Shape.bounds( graphNode.viewBounds );
    }

  }

  return inherit( Node, GraphNode, {
    reset: function() {
      this.updateBestFitLine();
    },

    update: function() {
      this.updateBestFitLine();
    },
    /**
     * Update Best Fit Line
     * @private
     */
    updateBestFitLine: function() {
      if ( this.graph.isLinearFitDefined() ) {
        var linearFitParameters = this.graph.getLinearFit();
        var boundaryPoints = this.graph.getBoundaryPoints( linearFitParameters.slope, linearFitParameters.intercept );
        this.bestFitLine.setPoint1( this.modelViewTransform.modelToViewPosition( boundaryPoints.point1 ) );
        this.bestFitLine.setPoint2( this.modelViewTransform.modelToViewPosition( boundaryPoints.point2 ) );
        this.bestFitLine.clipArea = Shape.bounds( this.viewBounds );
      }
      else {
        this.bestFitLine.setPoint1( 0, 0 ); // set line in the upper left corner
        this.bestFitLine.setPoint2( 0, 0 ); // of length zero
      }
    }

  } );
} )
;