// Copyright 2002-2015, University of Colorado Boulder

/**
 * Type that defines a residual and a square residual.
 *
 * @author John Blanco
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var Vector2 = require( 'DOT/Vector2' );

  /**
   *
   * @param {DataPoint} dataPoint
   * @param {number} slope
   * @param {number} intercept
   * @constructor
   */
  function Residual( dataPoint, slope, intercept ) {

    // store the dataPoint to be able to identify residual node
    this.dataPoint = dataPoint;

    // find the vertical position of the line following y = slope* x + intercept;
    var yValue = slope * dataPoint.position.x + intercept;

    // The vertical displacement is positive if the datePoint is above the line and negative if below
    var verticalDisplacement = dataPoint.position.y - yValue;

    // @public read-only
    this.point1 = new Vector2( dataPoint.position.x, dataPoint.position.y );  // position of dataPoint
    this.point2 = new Vector2( dataPoint.position.x, yValue );   // position of the point on the line

    // the square residual should not overlap the line
    // @public read-only
    this.isSquaredResidualToTheLeft = (slope * verticalDisplacement > 0);

  }

  return inherit( Object, Residual );
} );