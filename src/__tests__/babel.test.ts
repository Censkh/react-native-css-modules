import test  from "ava";
import * as babel from "@babel/core";

test("babel plugin", (t) => {
  const result = babel.transform(`

`, {
cwd: `${__dirname}/mock`,
    plugins: [
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require("../library/babel/BabelPlugin").default,
    ],
  });
  console.log(result);
});