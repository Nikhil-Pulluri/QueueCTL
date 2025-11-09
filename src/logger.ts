import winston from "winston"
import fs from "fs"
import path from "path"

const logDir = path.join(process.cwd(), "logs")
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })

const { combine, timestamp, printf } = winston.format

const logFormat = printf(({ level, message, timestamp, module }) => {
  const moduleTag = module ? `[${module}]` : `[General]`
  return `[${timestamp}] [${level.toUpperCase()}] ${moduleTag} ${message}`
})

const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "queuectl.log"),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  ]
})

if (process.env.NODE_ENV !== "production" && process.argv.includes("--verbose")) {
  baseLogger.add(
    new winston.transports.Console({
      format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), logFormat)
    })
  )
}

export function createLogger(moduleName: string) {
  return {
    info: (msg: string) => baseLogger.info(msg, { module: moduleName }),
    warn: (msg: string) => baseLogger.warn(msg, { module: moduleName }),
    error: (msg: string) => baseLogger.error(msg, { module: moduleName }),
    debug: (msg: string) => baseLogger.debug(msg, { module: moduleName })
  }
}
