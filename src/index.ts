import { Options, rmUp } from "./main";

export { Options, rmUp };

/** @deprecated Use named export: `import { rmUp } from "rm-up";` / `const { rmUp } = require("rm-up");` */
const deprecatedDefaultExport = rmUp;
export default deprecatedDefaultExport;
