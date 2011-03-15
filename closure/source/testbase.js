// Copyright 2010 Google Inc. All Rights Reserved.

/**
 * @fileoverview This is the base test file; the first file that should be
 *     included in any unit tests for Google TV Closure UI Library.
 */

/* tv.test namespace */
var tv = tv || {};
tv.test = tv.test || {};

(function() {
  var runningLocally = document.location.protocol == 'file:';

  /**
   * Convenience function to write a script tag for an external script
   */
  function includeTestScript(src) {
    document.write(
        '<script type="text/javascript" src="' + src + '"></script>');
  }

  // Get the path of the testbase file so we know where to include the other
  // files from
  var scripts = document.getElementsByTagName('script');
  var testbaseDir = './';
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].src;
    var l = src.length;
    if (src.substr(l - 11) == 'testbase.js') {
      testbaseDir = src.substr(0, l - 11);
      break;
    }
  }

  // Note: This must be set so that the dependency resolver in the closure
  // system knows to include dependencies relative to this directory
  window.CLOSURE_BASE_PATH = '../closure-library/closure/goog/';

  // Closure base.
  includeTestScript(CLOSURE_BASE_PATH + 'base.js');
  // Deps.
  includeTestScript('../deps.js');
  // Test runners.
  includeTestScript(CLOSURE_BASE_PATH + 'testing/testrunner.js');
  includeTestScript(CLOSURE_BASE_PATH + 'testing/jsunit.js');


  if (runningLocally && navigator.userAgent.indexOf('MSIE') == -1) {
    // When running locally, a variety of preconditions must be met.  When
    // running over the test server, however, everything is automatically
    // built and put into runfiles, and we don't want any extraneous code
    // like this affecting the tests running on the farm where tests are
    // harder to debug.  We skip this check on IE, however, since writing
    // script tags via document.write doesn't seem to ensure order, and
    // putting document.writes in a timeout nukes the document.
    tv.test.checkPreconditions_ = function() {
      /**
       * Writes a nice warning message.
       */
      function writeWarning(msg, opt_command) {
        var html = '<p><span style="color:red">WARNING!!! ' + msg + '</span><br>';
        if (opt_command) {
          html += '<code>' + opt_command + '</code>';
        }
        html += '</p>';
        document.write(html);
      }

      // Check deps.
      if (typeof goog == 'undefined') {
        writeWarning(
           'Unable to find goog. You need to have Closure Library checked out. Run in closure/source dir:',
           'svn checkout http://closure-library.googlecode.com/svn/trunk/ closure-library');
        return;
      }
      if (!goog.getPathFromDeps_('tv.ui.Component')) {
        writeWarning('Unable to find tv.ui.Component.');
      }
    };

    // Write as a script tag, so it will execute after the other scripts.
    document.write('<script>tv.test.checkPreconditions_();</script>');
  }
})();
