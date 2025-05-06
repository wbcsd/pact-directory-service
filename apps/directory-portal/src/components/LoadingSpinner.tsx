import React from "react";

const Spinner = (): React.ReactElement => {
  return (
    <div style={styles.container}>
      <div style={styles.spinnerContainer}>
        <div style={styles.spinnerBar} className="spinner-bar"></div>
      </div>
      <div style={styles.text}>Tests in progress...</div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    verticalAlign: "middle",
  },
  spinnerContainer: {
    width: "200px",
    height: "8px",
    backgroundColor: "#edf0f5",
    borderRadius: "4px",
    overflow: "hidden",
    position: "relative",
    marginBottom: "20px",
  },
  spinnerBar: {
    width: "80px",
    height: "100%",
    backgroundColor: "#10024a",
    borderRadius: "4px",
    position: "absolute",
    animation: "slide 1.5s infinite ease-in-out",
  },
  text: {
    fontWeight: "bold",
    color: "#10024a",
    fontSize: "18px",
  },
};

export default Spinner;
