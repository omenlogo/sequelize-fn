const fs = require("fs");
const Sequelize = require("sequelize");
const pipe = require("crocks/helpers/pipe");
const getPathOr = require("crocks/helpers/getPathOr");
const IO = require("crocks/IO");
const getPath = require("crocks/Maybe/getPath");
const path = require("path");
const either = require("crocks/pointfree/either");
const map = require("crocks/pointfree/map");
const tap = require("crocks/helpers/tap");
const run = require("crocks/pointfree/run");
const tryCatch = require("crocks/Result/tryCatch");
const converge = require("crocks/combinators/converge");
const isTruthy = require("crocks/predicates/isTruthy");
const identity = require("ramda/src/identity");
const forEach = require("ramda/src/forEach");

const error = message => () => {
  throw new Error(message);
};

// getSequelizeOptions :: Object a => a -> a
const getSequelizeOptions = getPathOr({}, ["sequelize", "options"]);

// getSequelizeUri :: Object a => a -> String
const getSequelizeUri = pipe(
  getPath(["sequelize", "dataBaseUri"]),
  either(error("Sequelize Uri Missing"), identity)
);

// createSequelizeInstance :: Object a , Sequelize s => (String,a) -> s
const createSequelizeInstance = (dataBaseUri, options) =>
  new Sequelize(dataBaseUri, options);

// initSequelize :: Object a , Sequelize s => a -> s|
const initSequelize = converge(
  createSequelizeInstance,
  getSequelizeUri,
  getSequelizeOptions
);

// readModelsFiles :: String -> IO(Result e [String])
const readModelsFiles = location =>
  IO.of(() => tryCatch(() => fs.readdirSync(location))());

// getModelsDir :: Object a =>  a -> String
const getModelsDir = pipe(
  getPath(["sequelize", "modelsDir"]),
  either(error("Invalid Models Configuration"), identity)
);

// mapIO :: (a -> b) -> IO(a) -> (a -> b)
const mapIO = fn => crocksIO => crocksIO.map(ioFn => pipe(ioFn, fn));

// buildModelsPaths :: String -> [String] -> [String]
const buildModelsPaths = modelsDir =>
  map(modelName => path.join(modelsDir, modelName));

// processFileOf :: String -> (IO(Result([String])) -> [String])
const processFileOf = modelsDir =>
  mapIO(either(error("Error Reading models"), buildModelsPaths(modelsDir)));

// getModelsDefinition :: String -> IO ([String])
const getModelsDefinitions = modelsDir =>
  pipe(readModelsFiles, processFileOf(modelsDir))(modelsDir);

// getModels :: Object -> IO([String])
const getModels = pipe(getModelsDir, getModelsDefinitions);

// importModels :: Seq s => (s, IO([String])) -> IO(s)
const importDefinitions = (sequelize, modelsDefinitions) =>
  modelsDefinitions.map(fn => () => {
    forEach(model => sequelize.import(model), fn());
    return sequelize;
  });

const importModels = converge(importDefinitions, initSequelize, getModels);
const setupAfterHook = (fn = identity) => mapIO(tap(fn));
const finish = config => seqIO =>
  isTruthy(config.sequelize.lazy) ? seqIO : seqIO();

// importer :: Object a, Sequelize s => (a, (s -> s)) -> IO(s) | s
const importer = (config, fn) =>
  pipe(importModels, setupAfterHook(fn), run, finish(config))(config);

module.exports = importer;
