import test                        from "ava";
import {generateReactNativeStyles} from "../library/shared/ReactNativeStylesGenerator";
import {processDynamicStyles}      from "../client/DynamicStyleProcessor";

test("class selector", (t) => {

  const styles = generateReactNativeStyles({
    src: `.text__underline {
    text-decoration: underline;
  }
  `,
  }).styles;

  {
    const output = processDynamicStyles([
      styles.text__underline,
    ], {
      vars: {},
    });

    t.deepEqual(output.result, [
      {
        __name             : "text__underline",
        __source: 0,
        textDecorationColor: "black",
        textDecorationLine : "underline",
        textDecorationStyle: "solid",
      },
    ]);
  }
});