'use strict';

var request = require('request');

module.exports = function (grunt) {

	var reloadPort = 35729,
	files;

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		less: {
			options: {
				paths: ['src/less'],
				compress: true
			},
			files: {
				dest: 'build/style.css',
				src: 'src/less/style.less'
			}
		},

				// Copies static assets from Bower components to public directories
				copy: {
					openlayers: {
						cwd: 'bower_components/openlayers/theme',
						src: 'default/*',
						dest: 'public/theme',
						expand: true
					}
				},

				// Not configured right yet!
				jshint: {
					options: {
						jshintrc: '.jshintrc'
					},
					all: [
					'Gruntfile.js',
				'<%= yeoman.app %>/scripts/{,*/}*.js',
				'!<%= yeoman.app %>/scripts/vendor/*',
			'test/spec/{,*/}*.js'
			]
		},

// Purge directories when building.
clean: {
	dist: ['build', 'public/js', 'public/css']
},

// Precompile JST templates used by the Backbone views.
jst: {
	compile: {
		files: {
			'build/templates.js': ['src/scripts/templates/*.ejs']
		}
	}
},

// Neuter is responsible for maintaining specified order for the include files so we can
// avoid failing declaration dependencies.
neuter: {
	app: {
		src: ['src/scripts/main.js'],
		dest: 'build/app.js'
	}
},

// This copies out the "main" bower files -- the ones to be consumed by our application --
// from the bower_components directory into the build directory where we'll concat and
// minify them.
bower: {
	install: {
		options: {
			targetDir: './build/lib',
			layout: 'byType',
			install: true,
			verbose: true,
			cleanTargetDir: false,
			cleanBowerDir: false
		}
	}
},

// Concatenate various scripts.
concat: {
		// Javascript below only pulls in what's pulled in from Bower and/or other vendor code (non-Bower)
		vendor: {
			files: {
				// We're enumerating these manually to ensure dependencies go OK.  Bad + good.
				'build/bower.js': [
				'build/lib/jquery/**/*.js',
				'build/lib/bootstrap/**/*.js',
					'build/lib/underscore/underscore-min.js', // Neither Backbone nor Underscore really place nice with Bower.
					'build/lib/backbone/backbone-min.js', // depends on Underscore.
					'build/lib/momentjs/moment.js', // depends on Underscore.
					'build/lib/q/q.js',
					'build/lib/highcharts/highcharts.js',
					'build/lib/proj4/proj4.js',
					'build/lib/jquery.scrollTo/jquery.scrollTo.js',
					'build/lib/d3/d3.js'
					]
				}
			},
		// This is what pulls together all of our custom + vendor application files.
		app: {
			files: {
				'public/js/client.js': [
				// Combined bower scripts
				'build/bower.js',

				// Non-bower vendor scripts
				'src/vendor/gantt-chart-d3.js',
				'src/vendor/slider/js/bootstrap-slider.js',

				// Our app
				'build/app.js'
				]
			}
		},
		css: {
			files: {
				'public/css/style.css': [
				'build/style.css'
				]
			}
		}
	},

	uglify: {

	},

	cssmin: {

	},

	develop: {
		server: {
			file: 'app.js'
		}
	},

	watch: {
		options: {
			nospawn: true,
			livereload: reloadPort
		},
		server: {
			files: [
			'app.js',
			'routes/*.js'
			],
			tasks: ['develop', 'delayed-livereload']
		},
		templates: {
			files: ['src/scripts/templates/**/*.ejs'],
			tasks: ['jst', 'neuter', 'concat', 'delayed-livereload'],
			options: {
				livereload: reloadPort
			}
		},
		js: {
			files: ['src/scripts/**/*.js'],
			tasks: ['default', 'develop', 'delayed-livereload'],
			options: {
				debounceDelay: 250
			}
		},
		less: {
			files: ['src/less/*.less'],
			tasks: ['less', 'concat'],
			options: {
				livereload: reloadPort
			}
		},
		jade: {
			files: ['views/*.jade'],
			options: {
				livereload: reloadPort
			}
		}
	}
});

grunt.config.requires('watch.server.files');
files = grunt.config('watch.server.files');
files = grunt.file.expand(files);

grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function () {
	var done = this.async();
	setTimeout(function () {
		request.get('http://localhost:' + reloadPort + '/changed?files=' + files.join(','), function (err, res) {
			var reloaded = !err && res.statusCode === 200;
			if (reloaded) {
				grunt.log.ok('Delayed live reload successful.');
			} else {
				grunt.log.error('Unable to make a delayed live reload.');
			}
			done(reloaded);
		});
	}, 1500);
});

grunt.loadNpmTasks('grunt-develop');
grunt.loadNpmTasks('grunt-neuter');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-bower-task');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-contrib-less');
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-jst');

grunt.registerTask('default', ['clean', 'less', 'bower', 'jst', 'neuter', 'concat', 'copy', 'develop', 'watch']);


};
