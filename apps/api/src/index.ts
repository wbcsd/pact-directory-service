import logger from "@src/util/logger";

import config from "@src/common/config";
import server from "./server";

// **** Run **** //

const SERVER_START_MSG =
  "Express server started on port: " + config.PORT;

server.listen(config.PORT, () => logger.info(SERVER_START_MSG));
