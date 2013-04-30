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

    options.paths.push(require("nib").path);

    // Iterate over the CSS rules, reducing to only @imports, then apply the
    // correct prefixed path to each file.  Finally, process each file and
    // concat into the output file.
    stylesheet.cssRules.reduce(function(paths, rule) {
      // If it has a path it's relevant, so add to the paths array.
      if (rule.href) {
        paths.push(rule.href);
      }

      return paths;
    }, []).map(function(path) {
      return options.prefix + path;
    }).concat(options.additional || []).forEach(function(filepath) {
      var contents = file.read(filepath);

      // Parse Stylus files.
      if (path.extname(filepath).slice(1) === "styl") {
        // Compile the source.
        return stylus.compile(String(contents), options, function(css) {
          output += css;
        });

      // Parse LESS files.
      } else if (path.extname(filepath).slice(1) === "less") {
        return grunt.helper("less", contents, options, function(css) {
          output += css;
        });
      }

      // Add vanilla CSS files.
      output += contents;
    });

    // Write out the debug file.
    file.write(processedTarget, output);
    
    // Success message.
    log.writeln("File " + processedTarget + " created.");
  });
};
