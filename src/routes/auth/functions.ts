import { Request, Response } from "express";
import { AsyncValidation, Validation } from "..";
import { isObjectId, logger, sendError } from "../../shared";
import bcrypt from "bcryptjs";
import Test from "../../models/Test";
import { mongoose } from "@typegoose/typegoose";
import validator from "validator";

interface StudentReq {
    createdAt?: Date;
    email?: string;
    isAdmin?: boolean;
    password?: string;
    tests?: mongoose.Types.ObjectId[];
    username?: string;
}

export function isStudentReq(arg: unknown): arg is StudentReq {
    return !!arg;
}

export function saveToken(res: Response, token: string) {
    res.cookie("token", token, {
        signed: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 3
    });
}

function _isValidPassword(password: string) {
    return password.length > 5 && password.length < 256;
}

function _isAdminValidator(isAdmin: unknown): Validation {
    if (typeof isAdmin === "boolean") return null;
    else if (isAdmin !== "true" && isAdmin !== "false") {
        return "Invalid 'isAdmin' param";
    }
    return null;
}

function _usernameValidator(username: unknown): Validation {
    if (typeof username !== "string") {
        return "Invalid 'username' param";
    } else if (username.length < 1) {
        return "'username' must be at least 1 char";
    }
    return null;
}

function _emailValidator(email: unknown): Validation {
    // Optional field, validate it only if it exists
    if (email === undefined || email === null) return null;
    else if (typeof email !== "string") {
        return "Invalid 'email' param";
    } else if (email.length < 1) {
        return "'email' must be at least 1 char";
    } else if (!validator.isEmail(email)) {
        return "Specified 'email' is invalid";
    }
    return null;
}

function _getIsAdminBool(isAdmin: unknown) {
    return typeof isAdmin === "boolean"
        ? isAdmin
        : isAdmin === "true"
        ? true
        : false;
}

export function passwordValidator(isAdmin: any, password: unknown): Validation {
    if (
        _getIsAdminBool(isAdmin) &&
        (typeof password !== "string" || !_isValidPassword(password))
    ) {
        return "Invalid 'password' param (must be > 5 char)";
    }
    return null;
}

async function _testsValidator(tests: unknown): AsyncValidation {
    if (!Array.isArray(tests)) return "Invalid 'tests' param";
    else if (!tests.every(t => isObjectId(t))) {
        return "Some of the specified 'tests' are invalid";
    }
    for (const test of tests) {
        if (!(await Test.exists(test))) {
            return "Some of the specified 'tests' are invalid";
        }
    }
    return null;
}

export async function sendStudentErrors(
    req: Request,
    res: Response,
    newDoc: boolean
): Promise<StudentReq | false> {
    const { isAdmin, username, email, password, tests } = req.body;

    const isAdminErr = _isAdminValidator(isAdmin);
    const usernameErr = _usernameValidator(username);
    const emailErr = _emailValidator(email);
    const passwordErr = passwordValidator(isAdmin, password);
    const testsErr = await _testsValidator(tests);

    // Check if correct
    if (newDoc) {
        if (isAdminErr) return sendError(res, isAdminErr), false;
        else if (usernameErr) return sendError(res, usernameErr), false;
        else if (emailErr) return sendError(res, emailErr), false;
        else if (passwordErr) return sendError(res, passwordErr), false;
        else if (testsErr) return sendError(res, testsErr), false;
    } else {
        if (isAdmin && isAdminErr) return sendError(res, isAdminErr), false;
        else if (username && usernameErr)
            return sendError(res, usernameErr), false;
        else if (email && emailErr) return sendError(res, emailErr), false;
        else if (password && passwordErr)
            return sendError(res, passwordErr), false;
        else if (tests && testsErr) return sendError(res, testsErr), false;
    }

    return {
        createdAt: new Date(),
        email,
        isAdmin: isAdmin !== undefined ? _getIsAdminBool(isAdmin) : undefined,
        password: isAdmin
            ? bcrypt.hashSync(password, bcrypt.genSaltSync(4))
            : undefined,
        tests,
        username
    };
}
