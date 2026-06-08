export const getLevelColor = (
  level: string
): "blue" | "green" | "yellow" | "red" | "gray" => {
  switch (level.toLowerCase()) {
    case "info":
      return "blue";
    case "debug":
      return "gray";
    case "warn":
      return "yellow";
    case "error":
      return "red";
    case "fatal":
      return "red";
    default:
      return "blue";
  }
};
