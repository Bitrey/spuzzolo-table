import { mongoose } from "@typegoose/typegoose";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import Student from "../models/Student";
import { logger } from "../shared";

interface UserWithId {
    _id?: string;
}

const noUser = (req: Request, next: NextFunction) => {
    // logger.debug("populateReqUser failed");

    req.student = null;
    return next();
};

const { JWT_SECRET } = process.env;

if (typeof JWT_SECRET !== "string") {
    logger.error("No JWT_SECRET env");
    process.exit(1);
}

export const populateReqUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.signedCookies["token"]) {
            return noUser(req, next);
        }

        const jwtUser: UserWithId = jwt.verify(
            req.signedCookies["token"],
            JWT_SECRET
        ) as any;
        if (!jwtUser._id) return noUser(req, next);

        const user = await Student.findOne({ _id: jwtUser._id }).exec();
        if (!user) return noUser(req, next);

        // logger.debug("populateReqUser successful");

        req.student = user;
        return next();
    } catch (err) {
        logger.debug(err);
        if (err instanceof mongoose.Error) {
            logger.error(err);
        }
        noUser(req, next);
    }
};
