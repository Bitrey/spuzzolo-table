import { mongoose } from "@typegoose/typegoose";
import { isValidObjectId } from "mongoose";
/**
 * Checks whether the arg is actually an ObjectId
 * (isValidObjectId is really stupid).
 * To convert the arg into an ObjectId you can do
 * ```new mongoose.Types.ObjectId(arg)```
 */
export function isObjectId(arg: unknown): boolean {
    try {
        if (!isValidObjectId(arg)) return false;
        new mongoose.Types.ObjectId(arg as any);
        return true;
    } catch (err) {
        return false;
    }
}
