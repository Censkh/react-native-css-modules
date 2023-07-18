import test                        from "ava";
import fs                          from "fs";
import {generateReactNativeStyles} from "../library/shared/ReactNativeStylesGenerator";
import {processDynamicStyles}      from "../client/DynamicStyleProcessor";
import {flatten}                   from "../library/shared/Utils";

test("media queries", (t) => {
  const {styles} = generateReactNativeStyles({
    src: fs.readFileSync(__dirname + "/mediaQueries.scss", "utf8"),
  });

  t.deepEqual(styles, {
    "test": {
      "__name"         : "test",
      "__source"       : 0,
      "backgroundColor": "red",
      "__dynamic"      : {
        "when": [
          {
            "classes"     : [],
            "style"       : {
              "backgroundColor": "blue",
              "__precedence"   : 1,
            },
            mediaQueries: [
              {
                expressions: [
                  {
                    feature: 'width',
                    modifier: 'min',
                    value: '200px',
                  },
                ],
                inverse: false,
                type: 'all',
              },
            ],
          },
        ],
      },
    },
  });

  const result = processDynamicStyles([styles.test], {
    dimensions: {
      getWidth : () => 300,
      getHeight: () => 300,
      listen   : () => {
        return () => {
        };
      },
    },
  });

  t.is(result.respondsToDimensionsChange, true);
  t.deepEqual(flatten(result.result), {
    backgroundColor: "blue",
  });
});
