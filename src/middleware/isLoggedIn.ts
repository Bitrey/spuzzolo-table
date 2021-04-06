import { mongoose } from "@typegoose/typegoose";
import { NextFunction, Request, Response } from "express";
import { UNAUTHORIZED } from "http-status";
import jwt from "jsonwebtoken";
import Student from "../models/Student";
import { logger, sendError } from "../shared";

export interface UserWithId {
    _id?: string;
}

const send401 = (req: Request, res: Response, next: NextFunction) => {
    // logger.debug("isLoggedIn failed");

    req.student = null;
    return sendError(res, "You're not logged in", UNAUTHORIZED);
};

export const isLoggedIn = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.signedCookies["token"]) return send401(req, res, next);

        const jwtUser: UserWithId = jwt.verify(
            req.signedCookies["token"],
            process.env.JWT_SECRET as string
        ) as any;
        if (!jwtUser._id) return send401(req, res, next);

        const user = await Student.findOne({ _id: jwtUser._id }).exec();
        if (!user) return send401(req, res, next);

        // logger.debug("isLoggedIn successful");

        req.student = user;
        return next();
    } catch (err) {
        logger.debug(err);
        if (err instanceof mongoose.Error) {
            logger.error(err);
        }
        return send401(req, res, next);
    }
};
