/* eslint-disable no-console */
import { Request, Response } from "express";
import { Format } from "logform";
import { ConsoleTransportInstance } from "winston/lib/winston/transports";
import { createLogger, format, transports } from "winston";
import moment from "moment";

export type WinstonLog = { message: string; level: string };

// Create console Transport
const { combine, colorize, printf } = format;

const formats: Format[] = [];

formats.push(colorize({ level: true }));

formats.push(
  printf(
    ({ level, message }) =>
      `${moment().format("HH:mm:ss")} ${level}: ${message}`
  )
);

const consoleTransport = new transports.Console({
  format: combine(...formats),
  level: "silly",
});

const loggingTransports: Array<ConsoleTransportInstance> = [consoleTransport];

// Create the production/development logger
const logger = createLogger({
  transports: loggingTransports,
});

// @ts-ignore
logger.error = (error) => {
  if (error instanceof Error) {
    logger.log({ level: "error", message: `${error.stack || error}` });
  } else {
    logger.log({ level: "error", message: error });
  }
};

export default logger;
