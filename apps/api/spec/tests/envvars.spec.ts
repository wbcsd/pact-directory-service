// Test environment variables configuration
describe("Environment Variables", () => {

  describe("DirectoryDatabase SSL Configuration", () => {

    beforeEach(() => {
      // Set up minimal required environment variables for testing
      process.env.NODE_ENV = "test";
      process.env.PORT = "3010";
      process.env.DIR_DB_HOST = "localhost";
      process.env.DIR_DB_USER = "postgres";
      process.env.DIR_DB_PASSWORD = "postgres";
      process.env.DIR_DB_NAME = "pact_directory_test";
      process.env.CONFORMANCE_API = "http://localhost:8004";
    });

    it("should default SSL to false when DIR_DB_SSL is not set", () => {
      // Save original value
      const originalValue = process.env.DIR_DB_SSL;
      
      // Clear the environment variable
      delete process.env.DIR_DB_SSL;
      
      // Dynamically import fresh configuration
      delete require.cache[require.resolve("@src/common/EnvVars")];
      const freshEnvVars = require("@src/common/EnvVars").default;
      
      expect(freshEnvVars.DirectoryDatabase.Ssl).toBe(false);
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.DIR_DB_SSL = originalValue;
      }
      
      // Clean up require cache
      delete require.cache[require.resolve("@src/common/EnvVars")];
    });

    it("should set SSL to true when DIR_DB_SSL is 'true'", () => {
      // Save original value
      const originalValue = process.env.DIR_DB_SSL;
      
      // Set environment variable to true
      process.env.DIR_DB_SSL = "true";
      
      // Dynamically import fresh configuration
      delete require.cache[require.resolve("@src/common/EnvVars")];
      const freshEnvVars = require("@src/common/EnvVars").default;
      
      expect(freshEnvVars.DirectoryDatabase.Ssl).toBe(true);
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.DIR_DB_SSL = originalValue;
      } else {
        delete process.env.DIR_DB_SSL;
      }
      
      // Clean up require cache
      delete require.cache[require.resolve("@src/common/EnvVars")];
    });

    it("should set SSL to false when DIR_DB_SSL is 'false'", () => {
      // Save original value
      const originalValue = process.env.DIR_DB_SSL;
      
      // Set environment variable to false
      process.env.DIR_DB_SSL = "false";
      
      // Dynamically import fresh configuration
      delete require.cache[require.resolve("@src/common/EnvVars")];
      const freshEnvVars = require("@src/common/EnvVars").default;
      
      expect(freshEnvVars.DirectoryDatabase.Ssl).toBe(false);
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.DIR_DB_SSL = originalValue;
      } else {
        delete process.env.DIR_DB_SSL;
      }
      
      // Clean up require cache
      delete require.cache[require.resolve("@src/common/EnvVars")];
    });

    it("should set SSL to false when DIR_DB_SSL has any other value", () => {
      // Save original value
      const originalValue = process.env.DIR_DB_SSL;
      
      // Set environment variable to some other value
      process.env.DIR_DB_SSL = "maybe";
      
      // Dynamically import fresh configuration
      delete require.cache[require.resolve("@src/common/EnvVars")];
      const freshEnvVars = require("@src/common/EnvVars").default;
      
      expect(freshEnvVars.DirectoryDatabase.Ssl).toBe(false);
      
      // Restore original value
      if (originalValue !== undefined) {
        process.env.DIR_DB_SSL = originalValue;
      } else {
        delete process.env.DIR_DB_SSL;
      }
      
      // Clean up require cache
      delete require.cache[require.resolve("@src/common/EnvVars")];
    });

  });

});