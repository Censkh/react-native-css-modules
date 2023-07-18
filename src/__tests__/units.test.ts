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

test("vw/vh", (t) => {

  const styles = generateReactNativeStyles({
    src: `.panel {
    height: 50vh;
  }`,
  }).styles;

  let height =  720;
  const dimensions = {
    getWidth : () => 1280,
    getHeight: () => height,
    listen   : () => {
      return () => {
      };
    }
  }

  {
    const output = processDynamicStyles([
      styles.panel,
    ], {
      dimensions: dimensions,
    });

    t.deepEqual(flatten(output.result), {
      height     : 360,
    });
  }

  {
    height = 1440;
    const output = processDynamicStyles([
      styles.panel,
    ], {
      dimensions: dimensions,
    });

    t.deepEqual(flatten(output.result), {
      height     : 720,
    });
  }

});
