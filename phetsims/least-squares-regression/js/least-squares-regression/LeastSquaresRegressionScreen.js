// Copyright 2002-2015, University of Colorado Boulder

/**
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var LeastSquaresRegressionModel = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/model/LeastSquaresRegressionModel' );
  var LeastSquaresRegressionScreenView = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/view/LeastSquaresRegressionScreenView' );
  var LSRConstants = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/LeastSquaresRegressionConstants' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Screen = require( 'JOIST/Screen' );

  // strings
  var leastSquaresRegressionSimString = require( 'string!LEAST_SQUARES_REGRESSION/least-squares-regression.name' );

  /**
   * @constructor
   */
  function LeastSquaresRegressionScreen() {

    //If this is a single-screen sim, then no icon is necessary.
    //If there are multiple screens, then the icon must be provided here.
    var icon = null;

    Screen.call( this, leastSquaresRegressionSimString, icon,
      function() {
        return new LeastSquaresRegressionModel();
      },
      function( model ) {
        return new LeastSquaresRegressionScreenView( model );
      },
      { backgroundColor: LSRConstants.BACKGROUND_COLOR }
    );
  }

  return inherit( Screen, LeastSquaresRegressionScreen );
} );