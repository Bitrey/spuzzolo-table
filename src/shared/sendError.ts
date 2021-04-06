import { Response } from "express";
import { BAD_REQUEST } from "http-status";
/**
 * Sends an error to the client in a JSON object as ```{err: <error message>}```
 * @param  {Response} res
 * @param  {string} motivation
 * @param  {} code Defaults to 400 Bad Request
 */
export const sendError = (
    res: Response,
    motivation: string,
    code = BAD_REQUEST
): void => {
    res.status(code).json({ err: motivation });
};
