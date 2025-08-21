import logger from "@src/util/logger";

import EnvVars from "@src/common/EnvVars";
import server from "./server";

// **** Run **** //

const SERVER_START_MSG =
  "Express server started on port: " + EnvVars.Port;

server.listen(EnvVars.Port, () => logger.info(SERVER_START_MSG));
