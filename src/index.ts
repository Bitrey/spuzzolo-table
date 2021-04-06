import "./config";
import express from "express";
import routes from "./routes";
import { DocumentType } from "@typegoose/typegoose";
import { StudentClass } from "./models/Student";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import { logger, LoggerStream, sendError } from "./shared";
import { NOT_FOUND } from "http-status";
import morgan from "morgan";
import { populateReqUser } from "./middleware/populateReqUser";
const app = express();

declare global {
    namespace Express {
        interface Request {
            student: DocumentType<StudentClass> | null;
        }
    }
}

// app.use(morgan("dev", { stream: new LoggerStream() }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

if (typeof process.env.COOKIE_SECRET !== "string") {
    logger.error("No COOKIE_SECRET env");
    process.exit(1);
}

app.use(cookieParser(process.env.COOKIE_SECRET));

app.use(populateReqUser);

app.use("/", routes);
app.all("*", (req, res) => sendError(res, "Page not found", NOT_FOUND));

const PORT = Number(process.env.PORT) || 3000;
const IP = process.env.IP || "127.0.0.1";
app.listen(PORT, IP, () => {
    logger.info(`Server started on ${IP}:${PORT}`);
});
