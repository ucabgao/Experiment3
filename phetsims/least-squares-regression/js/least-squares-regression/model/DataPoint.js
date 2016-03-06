// Copyright 2002-2015, University of Colorado Boulder

/**
 * Type that defines a data point.
 *
 * @author John Blanco
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var LeastSquaresRegressionConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var PropertySet = require( 'AXON/PropertySet' );
  var Vector2 = require( 'DOT/Vector2' );

  /**
   * @param {Vector2} initialPosition
   * @constructor
   */
  function DataPoint( initialPosition ) {

    PropertySet.call( this, {

      // Property that indicates where in model space the center of this data point is.
      position: initialPosition,

      // Flag that tracks whether the user is dragging this data point around. Should be set externally, generally by the a
      // view node.
      userControlled: false,

      // Flag that indicates whether this element is animating from one location to the bucket.
      animating: false

    } );

  }

  return inherit( PropertySet, DataPoint, {
    /**
     * Animate the data Point
     * @param {number} dt
     */
    step: function( dt ) {
      if ( this.animating ) {
        this.animationStep( dt );
      }
    },

    /**
     * Function that animates dataPoint back to the bucket.
     * @private
     * @param {number} dt
     */
    animationStep: function( dt ) {

      // perform any animation
      var distanceToDestination = this.position.distance( this.positionProperty.initialValue );

      // If the particle is further than one time step away, move it toward the destination
      // TODO: issue #27, Would it be appropriate to use TWEEN.js here?  If not, perhaps comment that it was an option and another strategy was used
      if ( distanceToDestination > dt * LeastSquaresRegressionConstants.ANIMATION_VELOCITY ) {

        // Move a step toward the position.
        var stepAngle = Math.atan2( this.positionProperty.initialValue.y - this.position.y, this.positionProperty.initialValue.x - this.position.x );
        var stepVector = Vector2.createPolar( LeastSquaresRegressionConstants.ANIMATION_VELOCITY * dt, stepAngle );
        this.position = this.position.plus( stepVector );
      }
      else {

        // Less than one time step away, so just go to the initial position.
        this.position = this.positionProperty.initialValue;
        this.animating = false;
        this.trigger( 'returnedToOrigin' );
      }
    }

  } );
} );