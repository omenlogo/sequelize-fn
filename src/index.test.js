"use strict";

const importer = require("./");
const fs = require("fs");

jest.mock("sequelize");
jest.mock("fs");

const userPath = "/path/to/models/user.js";

describe("Sequelize Importer", () => {
  beforeAll(() => {
    const MOCK_FILES = {
      [userPath]: "user.js"
    };

    fs.__setMockFiles(MOCK_FILES);
  });

  test("It throw when sequelize keys is not defined in the config", () => {
    expect(() => importer()).toThrow();
  });

  test("It throw when database uri is not defined", () => {
    expect(() => importer({ sequelize: {} })).toThrow();
  });

  test("It throw when modelsDir is not specified", () => {
    expect(() => importer({ sequelize: { dataBaseUri: "test" } })).toThrow();
  });

  test("It import the correct ammount of models", () => {
    const seqInstance = importer({
      sequelize: {
        modelsDir: "/path/to/models",
        dataBaseUri: "mysql://root:password@lsocalhost/test"
      }
    });

    expect(seqInstance.import.mock.calls.length).toBe(1);
  });

  test("It can have a lazy behavior configured by the user", () => {
    const seqInstance = importer({
      sequelize: {
        lazy: true,
        modelsDir: "/path/to/models",
        dataBaseUri: "mysql://root:password@lsocalhost/test"
      }
    });

    expect(typeof seqInstance).toBe("function");
  });
});