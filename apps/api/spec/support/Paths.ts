/**
 * Convert paths to full for testing.
 */

import jetPaths from "jet-paths";

import Paths from "@src/common/Paths";
// get the tests working
(Paths as any).Base = "/api/directory";
export default jetPaths(Paths);
