import { mongoose } from "@typegoose/typegoose";
import { Response } from "express";
import { INTERNAL_SERVER_ERROR } from "http-status";
import { logger } from "./logger";
import { sendError } from "./sendError";

export const sendCorrectError = (res: Response, err: unknown) => {
    if (err instanceof mongoose.Error.ValidationError) {
        const badFields = Object.keys((err.toJSON() as any).errors);
        logger.debug(err.message);
        return sendError(
            res,
            "Invalid data" + badFields ? `: '${badFields.join("', '")}'` : ""
        );
    } else {
        // console.log("dio porco", err)
        logger.error(err);
        return sendError(res, "Unknown error", INTERNAL_SERVER_ERROR);
    }
};
