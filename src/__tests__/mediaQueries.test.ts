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
            "classes"   : [],
            "style"     : {
              "backgroundColor": "blue",
              "__precedence"   : 1,
            },
            mediaQueries: [
              {
                expressions: [
                  {
                    feature : "width",
                    modifier: "min",
                    value   : "200px",
                  },
                ],
                inverse    : false,
                type       : "all",
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

test("nested media queries", (t) => {
  const styles = generateReactNativeStyles({
    src: `.screen {
  height: 70vh;
  width: 100%;

  @media (min-width: 1024px) {
    align-self: flex-end;
    width: 70vw;
    height: 100%;
  }

}`,
  }).styles;

  let width       = 720;
  const dimensions = {
    getWidth : () => width,
    getHeight: () => 640,
    listen   : () => {
      return () => {
      };
    },
  };

  {
    const output = processDynamicStyles([
      styles.screen,
    ], {
      dimensions: dimensions,
    });

    t.deepEqual(flatten(output.result), {
      height: 448,
      width : "100%",
    });
  }

  {
    width = 1040;
    const output = processDynamicStyles([
      styles.screen,
    ], {
      dimensions: dimensions,
      debug: false
    });

    t.deepEqual(flatten(output.result), {
      alignSelf: "flex-end",
      height: "100%",
      width : 728,
    });
  }
});
