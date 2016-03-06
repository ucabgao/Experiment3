// Copyright 2002-2015, University of Colorado Boulder

/**
 * Contains all of the model logic for the screen LeastSquaresRegressionScreen.
 *
 * @author Martin Veillette (Berea College)
 */
define( function( require ) {
  'use strict';

  // modules
  var Bucket = require( 'PHETCOMMON/model/Bucket' );
  var DataPoint = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/model/DataPoint' );
  var DataSet = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/model/DataSet' );
  var Dimension2 = require( 'DOT/Dimension2' );
  var Graph = require( 'LEAST_SQUARES_REGRESSION/least-squares-regression/model/Graph' );
  var inherit = require( 'PHET_CORE/inherit' );
  var ObservableArray = require( 'AXON/ObservableArray' );
  var PropertySet = require( 'AXON/PropertySet' );
  var Util = require( 'DOT/Util' );
  var Vector2 = require( 'DOT/Vector2' );

  // constants
  var BUCKET_SIZE = new Dimension2( 100, 55 );
  var BUCKET_POSITION = new Vector2( 120, 480 );

  /**
   * @constructor
   */
  function LeastSquaresRegressionModel() {

    var thisModel = this;
    PropertySet.call( thisModel, {
      showGrid: false, // controls the visibility of the graph grid
      selectedDataSet: DataSet.CUSTOM  // dataSet selected by the Combo Box: initially value set on Custom
    } );

    // Array of dataPoints in the model (may not be necessarily on the graph, could be user controlled outside the graph zone or animated)
    this.dataPoints = new ObservableArray(); // @public

    // The various data Sets that populates the Combo Box
    // @public read-only
    this.dataSets = [];
    this.dataSets.push( DataSet.CUSTOM );
    this.dataSets.push( DataSet.HEIGHT_SHOE );
    this.dataSets.push( DataSet.SPENDING_SALARY );
    this.dataSets.push( DataSet.MORTALITY_YEAR );
    this.dataSets.push( DataSet.WAGE_YEAR );
    this.dataSets.push( DataSet.USER_YEAR );
    this.dataSets.push( DataSet.GASOLINE_YEAR );
    this.dataSets.push( DataSet.LIFE_TV );
    this.dataSets.push( DataSet.SPEED_DISTANCE );
    this.dataSets.push( DataSet.TEMPERATURE_FAHRENHEIT_CHIRP );
    this.dataSets.push( DataSet.TEMPERATURE_FAHRENHEIT_LONGITUDE );
    this.dataSets.push( DataSet.TEMPERATURE_FAHRENHEIT_LATITUDE );
    this.dataSets.push( DataSet.TEMPERATURE_CELSIUS_CHIRP );
    this.dataSets.push( DataSet.TEMPERATURE_CELSIUS_LONGITUDE );
    this.dataSets.push( DataSet.TEMPERATURE_CELSIUS_LATITUDE );


    // Model of the graph that contains all information regarding the composition of the graph
    // @public read-only
    this.graph = new Graph(
      this.selectedDataSet.xRange,
      this.selectedDataSet.yRange
    );

    // Bucket model to be filled with dataPoint
    // @public read-only
    this.bucket = new Bucket( {
      position: BUCKET_POSITION,
      baseColor: '#000080',
      caption: '',
      size: BUCKET_SIZE,
      invertY: true
    } );

    // What to do when the selected Data Set changes
    this.selectedDataSetProperty.link( function( selectedDataSet ) {

      // unlink the listeners to dataPoints
      // this address an issue if one is userControlling a dataPoint while changing selecting a new dataSet (only possible with multitouch)
      //  see  https://github.com/phetsims/least-squares-regression/issues/11
      thisModel.dispose();

      // Clear the dataPoints array
      thisModel.dataPoints.clear();

      // Clear the residual arrays and the dataPointsOnGraph array
      thisModel.graph.resetOnChangeOfDataSet();

      // Set the horizontal range, vertical range, and multiplicative factors for the slope and the intercept
      thisModel.graph.setGraphDomain( selectedDataSet.xRange, selectedDataSet.yRange );

      // Populate the dataPoints array with the new SelectedDataSet
      selectedDataSet.dataXY.forEach( function( position ) {
        // For your information, only one modelViewTransform is used throughout the simulation, the bounds of the model are set by the graph bounds
        // Rescale all the {X,Y} value to the normalized graph bounds
        var XNormalized = Util.linear( selectedDataSet.xRange.min, selectedDataSet.xRange.max, thisModel.graph.bounds.minX, thisModel.graph.bounds.maxX, position.x );
        var YNormalized = Util.linear( selectedDataSet.yRange.min, selectedDataSet.yRange.max, thisModel.graph.bounds.minY, thisModel.graph.bounds.maxY, position.y );
        var positionVector = new Vector2( XNormalized, YNormalized );
        thisModel.dataPoints.push( new DataPoint( positionVector ) );
      } );

      // Add the Data Points on Graph and all the Residuals
      // For performance reason, we do it in bulk so that we don't constantly update the residuals after adding a dataPoint
      thisModel.graph.addDataPointsOnGraphAndResidualsInBulk( thisModel.dataPoints );

      // Since we added the dataPoints in Bulk, let's send a trigger to the view
      thisModel.trigger( 'DataPointsAdded' );
    } );
  }

  return inherit( PropertySet, LeastSquaresRegressionModel, {

    reset: function() {
      PropertySet.prototype.reset.call( this );
      this.dispose();
      this.dataPoints.clear();
      this.graph.reset();
    },

    // Step is responsible for the animation of the dataPoints when they return to the bucket
    step: function( dt ) {
      this.dataPoints.forEach( function( dataPoint ) {
        dataPoint.step( dt );
      } );
    },

    /**
     * Unlink listeners to dataPoint
     */
    dispose: function() {
      this.dataPoints.forEach( function( dataPoint ) {
        dataPoint.positionProperty.unlink( dataPoint.positionListener );
        dataPoint.userControlledProperty.unlink( dataPoint.userControlledListener );
      } );
    },

    // Function that sets all dataPoint animating flag to true, setting them up to be animated in the step function
    // @public
    returnAllDataPointsToBucket: function() {
      this.dataPoints.forEach( function( dataPoint ) {
        dataPoint.animating = true;
      } );
    },

    /**
     * Function for adding new dataPoints to this model when the user creates them, generally by clicking on some
     * some sort of creator node.
     * @public
     * @param {DataPoint} dataPoint
     */
    addUserCreatedDataPoint: function( dataPoint ) {
      var self = this;
      this.dataPoints.push( dataPoint );

      dataPoint.positionListener = function( position ) {
        // Check if the point is not animated and is overlapping with the graph before adding on the list of graph data Points
        if ( self.graph.isDataPointPositionOverlappingGraph( position ) && !dataPoint.animating ) {

          if ( !self.graph.isDataPointOnList( dataPoint ) )
          // Add dataPoint to the array of dataPoint on graph as well as the associated residuals.
          {
            self.graph.addPointAndResiduals( dataPoint );
          }
        }
        else {
          if ( self.graph.isDataPointOnList( dataPoint ) ) {
            // Remove dataPoint from dataPoint on graph and its associated residuals.
            self.graph.removePointAndResiduals( dataPoint );
          }
        }
      };

      dataPoint.positionProperty.link( dataPoint.positionListener );

      dataPoint.userControlledListener = function( userControlled ) {
        var isOnGraph = self.graph.isDataPointPositionOverlappingGraph( dataPoint.position );
        if ( !isOnGraph && !userControlled ) {
          dataPoint.animating = true;
        }
      };

      // Determine if the data Point is not user controlled and not on graph. If so let's animate it, i.e. return it to the bucket
      dataPoint.userControlledProperty.link( dataPoint.userControlledListener );

      // The dataPoint will be removed from the model if and when it returns to its origination point. This is how a dataPoint
      // can be 'put back' into the bucket.
      dataPoint.on( 'returnedToOrigin', function() {
        self.dataPoints.remove( dataPoint );
      } );
    }

  } );

} );

