/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

'use strict';

// -----------------------------------------------------------------------------

import {MediaQuery} from "../../common/Styles";

const RE_MEDIA_QUERY   = /^(?:(only|not)?\s*([_a-z][_a-z0-9-]*)|(\([^\)]+\)))(?:\s*and\s*(.*))?$/i,
      RE_MQ_EXPRESSION = /^\(\s*([_a-z-][_a-z0-9-]*)\s*(?:\:\s*([^\)]+))?\s*\)$/,
      RE_MQ_FEATURE    = /^(?:(min|max)-)?(.+)/;



export function parseQuery(mediaQuery: string): MediaQuery {
  return mediaQuery.split(',').map(function (query) {
    query = query.trim();

    const captures = query.match(RE_MEDIA_QUERY);

    // Media Query must be valid.
    if (!captures) {
      throw new SyntaxError('Invalid CSS media query: "' + query + '"');
    }

    let modifier    = captures[1],
        type        = captures[2],
        expressions: any = ((captures[3] || "") + (captures[4] || "")).trim(),
        parsed: any      = {};

    parsed.inverse = !!modifier && modifier.toLowerCase() === 'not';
    parsed.type    = type ? type.toLowerCase() : 'all';

    // Check for media query expressions.
    if (!expressions) {
      parsed.expressions = [];
      return parsed;
    }

    // Split expressions into a list.
    expressions = expressions.match(/\([^\)]+\)/g);

    // Media Query must be valid.
    if (!expressions) {
      throw new SyntaxError('Invalid CSS media query: "' + query + '"');
    }

    parsed.expressions = expressions.map(function (expression: any) {
      var captures = expression.match(RE_MQ_EXPRESSION);

      // Media Query must be valid.
      if (!captures) {
        throw new SyntaxError('Invalid CSS media query: "' + query + '"');
      }

      var feature = captures[1].toLowerCase().match(RE_MQ_FEATURE);

      return {
        modifier: feature[1],
        feature : feature[2],
        value   : captures[2]
      };
    });

    return parsed;
  });
}

