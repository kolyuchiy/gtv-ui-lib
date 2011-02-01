#!/bin/bash
#
# Calculates deps.js for tv.ui.Decoration package.
#
# Copyright 2010 Google Inc. All Rights Reserved.

./static/closure-library-20100917-r305/closure/bin/build/depswriter.py \
  --root_with_prefix="static/tv-ui/ ../../../tv-ui" \
  --output_file=static/tv-ui/deps.js

