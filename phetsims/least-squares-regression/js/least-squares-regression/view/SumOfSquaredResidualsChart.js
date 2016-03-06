// Copyright 2002-2015, University of Colorado Boulder

/**
 * A Scenery Node that represents a barometer chart of the sum of square residuals .
 *
 * @author Martin Veillette (Berea College)
 */

define( function( require ) {
  'use strict';

  // modules
  var ArrowNode = require( 'SCENERY_PHET/ArrowNode' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Line = require( 'SCENERY/nodes/Line' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Property = require( 'AXON/Property' );
  var Rectangle = require( 'SCENERY/nodes/Rectangle' );
  var Text = require( 'SCENERY/nodes/Text' );

  // strings
  var sumString = require( 'string!LEAST_SQUARES_REGRESSION/sum' );

  // constants
  var ARROW_LENGTH = 175;
  var ARROW_HEAD_WIDTH = 4;
  var ARROW_HEAD_HEIGHT = 6;
  var RECTANGLE_BAROMETER_HEIGHT = 10;
  var LINE_WIDTH = 1;
  var LINE_COLOR = 'black';
  var FONT = LSRConstants.SUM_RESIDUALS_FONT;

  /**
   * @param {Graph} graph - model of a graph
   * @param {Array.<DataPoint>} dataPoints - an array of DataPoint
   * @param {Function} getSumOfSquaredResiduals -
   * @param {Function} onEvent - listener function when event is trigger
   * @param {Color} fillColor
   * @param {Property.<boolean>} visibleProperty
   * @constructor
   */
  function SumOfSquaredResidualsChart( graph, dataPoints, getSumOfSquaredResiduals, onEvent, fillColor, visibleProperty ) {

    Node.call( this );

    // The barometer chart is on its side, set width to 1 , will update it momentarily
    var rectangleBarometer = new Rectangle( 0, 0, 1, RECTANGLE_BAROMETER_HEIGHT, {
      fill: fillColor,
      bottom: -LINE_WIDTH,
      left: LINE_WIDTH / 2
    } );

    // Create the chart
    var horizontalArrow = new ArrowNode( 0, 0, ARROW_LENGTH, 0, {
      tailWidth: LINE_WIDTH,
      headWidth: ARROW_HEAD_WIDTH,
      headHeight: ARROW_HEAD_HEIGHT
    } );
    var verticalLine = new Line( 0, 0, 0, -2 * RECTANGLE_BAROMETER_HEIGHT, {
      lineWidth: LINE_WIDTH,
      stroke: LINE_COLOR
    } );

    // Text for the chart
    var label = new Text( sumString, {
      font: FONT,
      centerX: horizontalArrow.centerX,
      top: horizontalArrow.bottom + 5
    } );
    var zeroLabel = new Text( '0', { font: FONT, centerX: horizontalArrow.left, top: horizontalArrow.bottom + 5 } );

    /**
     * For an input value ranging from 0 to infinity, the tanh function will return a value ranging between 0 and 1
     * @param {number} x
     * @returns {number}
     */
    function tanh( x ) {
      // this (particular) definition of hyperbolic tan function will work well for large positive x values
      return (1 - Math.exp( -2 * x )) / (1 + Math.exp( -2 * x ));
    }

    /**
     * Update the width of the rectangular Barometer
     */
    function updateWidth() {
      // the width of the barometer is a non-linear. we use the tanh function to map an infinite range to a finite range
      // Note that tanh(0.5)=0.46. i.e  approximately 1/2;
      // We want that a sum of squared residuals of 1/8 the area of the visible graph yields a width that reaches
      // half the maximum value hence the value 4=8*1/2 .
      rectangleBarometer.rectWidth = ARROW_LENGTH * tanh( 4 * getSumOfSquaredResiduals() );
    }

    // The barometer width is adjustable
    // the square of the residuals vary if the position of the point change, points are added/subtracted to the graph and if the line change position
    Property.multilink( [ graph.angleProperty, graph.interceptProperty ], function( angle, intercept ) {
      updateWidth();
    } );

    // The width of the barometer changes if (1) a dataPoint is added, (2) removed, (3) its position changes
    dataPoints.addItemAddedListener( function( addedDataPoint ) {
      addedDataPoint.positionProperty.link( updateWidth );

      dataPoints.addItemRemovedListener( function removalListener( removedDataPoint ) {
        if ( removedDataPoint === addedDataPoint ) {
          removedDataPoint.positionProperty.unlink( updateWidth );
        }
        dataPoints.removeItemRemovedListener( removalListener );
      } );
    } );

    // Trigger an update after all the points have been added in bulk to the model
    onEvent( 'DataPointsAdded', updateWidth );

    // Controls the visibility of this node
    visibleProperty.linkAttribute( this, 'visible' );

    // Add all the nodes
    this.addChild( verticalLine );
    this.addChild( horizontalArrow );
    this.addChild( rectangleBarometer );
    this.addChild( zeroLabel );
    this.addChild( label );

  }

  return inherit( Node, SumOfSquaredResidualsChart );
} )
;