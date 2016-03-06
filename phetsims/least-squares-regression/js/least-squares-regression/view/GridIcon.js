// Copyright 2002-2015, University of Colorado Boulder

/**
 * A Scenery node that depicts a grid icon.
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var Bounds2 = require( 'DOT/Bounds2' );
  var inherit = require( 'PHET_CORE/inherit' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Path = require( 'SCENERY/nodes/Path' );
  var Shape = require( 'KITE/Shape' );

  /**
   *
   * @param {Object} [options]
   * @constructor
   */
  function GridIcon( options ) {

    Node.call( this );

    options = _.extend( {
      // defaults
      columns: 4,
      rows: 4,
      cellLength: 12, // in scenery coordinates
      gridStroke: LSRConstants.MAJOR_GRID_STROKE_COLOR,
      gridLineWidth: 1,
      gridFill: null
    }, options );

    var bounds = new Bounds2( 0, 0, options.columns * options.cellLength, options.rows * options.cellLength );
    var gridShape = new Shape();

    // Create the vertical lines
    for ( var i = bounds.minX + options.cellLength; i < bounds.maxX; i += options.cellLength ) {
      gridShape.moveTo( i, bounds.minY ).verticalLineTo( bounds.maxX );
    }

    // Create the horizontal lines
    for ( i = bounds.minY + options.cellLength; i < bounds.maxY; i += options.cellLength ) {
      gridShape.moveTo( bounds.minX, i ).horizontalLineTo( bounds.maxY );
    }

    var gridPath = new Path( gridShape, {
      stroke: options.gridStroke,
      lineWidth: options.gridLineWidth,
      fill: options.gridFill
    } );

    this.addChild( gridPath );

    // Pass options through to the parent class.
    this.mutate( options );
  }

  return inherit( Node, GridIcon );
} )
;