/*
 * grunt-bbb-styles
 * http://gruntjs.com/
 *
 * Copyright (c) 2013 Tim Branyen
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {
  "use strict";

  var path = require("path");
  var cssom = require("cssom");

  // Grunt.
  var _ = grunt.util._;
  var log = grunt.log;
  var file = grunt.file;

  grunt.registerMultiTask("styles", "Compile project styles.", function() {
    var done = this.async();
    // Output file.
    var output = "";
    // Options.
    var options = this.data;
    // Read in the contents.
    var contents = file.read(options.src);
    // Parse the stylesheet.
    var stylesheet = cssom.parse(contents);
    // Include the Stylus library.
    var stylus = require("grunt-lib-stylus").init(grunt);
    var less = require("grunt-lib-less").init(grunt);
    // Ensure that any template's used in the file name are accounted for.
    var processedTarget = grunt.config.process(this.target);

    // If no CSS rules are defined, why are we even here?
    if (!Array.isArray(stylesheet.cssRules)) {
      return log.write("No css imports defined.");
    }

    if (!options.paths) {
      options.paths = [];
    }

    if (!options.prefix) {
      options.prefix = "./app/styles/";
    }

    // Iterate over the CSS rules, reducing to only @imports, then apply the
    // correct prefixed path to each file.
    var paths = stylesheet.cssRules.reduce(function(paths, rule) {
      // If it has a path it's relevant, so add to the paths array.
      if (rule.href) {
        paths.push(rule.href);
      }

      return paths;
    }, []).map(function(path) {
      return options.prefix + path;
    }).concat(options.additional || []);

    function additionalProcessing(css, filepath) {
      var url =/(url\([\'"]?)((?:[^\);](?!base64))+)([\'"]?\))/g;
      var dir = path.dirname(filepath);
      var rel = options.forceRelative;

      // Augment paths if a forceRelative path is specificed.
      if (options.hasOwnProperty("forceRelative")) {

        // Search the content for the url pattern
        // and call our function to dynamically create
        // a replacement
        return css.replace(url, function(match, p1, p2, p3){
          return p1 + rel + path.join(dir, p2) + p3;
        });
      }

      return css;
    }

    function process(paths, cb) {
      if (!paths.length) { return cb(); }

      var opts = {
        paths: [].concat(options.paths)
      };

      // Get the first path off the array.
      var filepath = paths.shift();
      // Find the contents.
      var contents = file.read(filepath);

      // Add the current dirname to the paths.
      opts.paths.push(path.dirname(filepath));

      // Parse Stylus files.
      if (path.extname(filepath).slice(1) === "styl") {
        // Compile the source.
        return stylus.compile(String(contents), opts, function(css) {
          output += additionalProcessing(css, filepath);

          // Continue processing.
          process(paths, cb);
        });

      // Parse LESS files.
      } else if (path.extname(filepath).slice(1) === "less") {
        // Compile the source.
        return less.compile(String(contents), opts, function(css) {
          output += additionalProcessing(css, filepath);

          // Continue processing.
          process(paths, cb);
        });
      }

      // Add vanilla CSS files.
      output += additionalProcessing(contents, filepath);

      // Continue processing.
      return process(paths, cb);
    }

    // Once finished processing...
    process(paths, function() {
      // Write out the debug file.
      file.write(processedTarget, output);
      
      // Success message.
      log.writeln("File " + processedTarget + " created.");

      done();
    });
  });
};
