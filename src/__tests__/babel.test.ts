import test  from "ava";
import * as babel from "@babel/core";
import BabelPlugin from "../library/babel/BabelPlugin";

test("babel plugin", (t) => {
  const result = babel.transform(`
    import styles1 from './Text/Text.module.scss';
    import styles2 from './NextTo.module.scss';
    import './NextTo.module.scss';

    require('./Text/Text.module.scss');

    styles1.text;
    styles2.nextTo;
`, {
cwd: `${__dirname}/mock`,
    plugins: [
      BabelPlugin(),
    ],
  });
  t.is(result?.code, `import styles1 from "./Text/Text.generated-styles";
import styles2 from "./NextTo.generated-styles";
import "./NextTo.generated-styles";
require("./Text/Text.generated-styles");
styles1.text;
styles2.nextTo;`);
});