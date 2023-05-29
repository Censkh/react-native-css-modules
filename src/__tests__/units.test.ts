import test                        from "ava";
import {generateReactNativeStyles} from "../library/shared/ReactNativeStylesGenerator";
import {processDynamicStyles}      from "../client/DynamicStyleProcessor";
import {flatten}                   from "../library/shared/Utils";

test("rem", (t) => {

  const styles = generateReactNativeStyles({
    src: `.button {
    height: 2rem;
    border-width: 2px;
  }`,
  }).styles;

  {
    const output = processDynamicStyles([
      styles.button,
      styles.sm,
    ], {
      vars: {},
    });

    t.deepEqual(flatten(output.result), {
      borderWidth: 2,
      height     : 32,
    });
  }

});

