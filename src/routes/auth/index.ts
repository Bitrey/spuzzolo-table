import { Request, Response, Router } from "express";
import { INTERNAL_SERVER_ERROR, OK, UNAUTHORIZED } from "http-status";
import { isLoggedIn } from "../../middleware/isLoggedIn";
import Student from "../../models/Student";
import { isObjectId, logger, sendCorrectError, sendError } from "../../shared";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Test from "../../models/Test";
import {
    isStudentReq,
    passwordValidator,
    saveToken,
    sendStudentErrors
} from "./functions";

const router = Router();
/**
 * Please note that it doesn't actually send anything
 */
export function logout(req: Request, res: Response) {
    if (req.student) req.student = null;
    res.clearCookie("token");
}

router.get("/logout", (req, res) => {
    logger.debug(`'${req.student?.username}' logging out`);
    logout(req, res);
    res.sendStatus(OK);
});

// You can login only if you're an admin
router.post("/login", async (req, res) => {
    if (req.student) {
        return sendError(res, "You're already logged in");
    }

    // Read username and password from request body
    const { username, password } = req.body;

    if (typeof username !== "string" || username.length < 1) {
        return sendError(res, "Invalid 'username' param");
    } else if (typeof password !== "string" || password.length < 1) {
        return sendError(res, "Invalid 'password' param");
    }

    const student = await Student.findOne({ username }).exec();

    if (!student) {
        return sendError(res, "User not found");
    } else if (!student.isAdmin) {
        return sendError(res, "User is not admin");
    } else if (!student.password) {
        logger.error(`Admin '${student.username}' doesn't have a password`);
        return sendError(
            res,
            "Admin doesn't have password",
            INTERNAL_SERVER_ERROR
        );
    }

    const validPw = bcrypt.compareSync(password, student.password);
    if (!validPw) {
        return sendError(res, "Invalid password");
    }

    // Generate an access token
    const token = jwt.sign(
        { _id: student._id },
        process.env.JWT_SECRET as string
    );

    logger.debug(`'${student.username}' logged in`);

    saveToken(res, token);
    res.json(student);
});

router.post("/signup", isLoggedIn, async (req, res) => {
    if (!req.student?.isAdmin) {
        return sendError(res, "You're not an admin", UNAUTHORIZED);
    }

    const studentReq = await sendStudentErrors(req, res, true);
    if (!isStudentReq(studentReq)) return;

    const { username, email } = req.body;

    if (await Student.exists({ username })) {
        return (
            sendError(res, "User with given 'username' already exists"), false
        );
    } else if (await Student.exists({ email })) {
        return sendError(res, "User with given 'email' already exists"), false;
    }

    const student = new Student(studentReq);

    logger.debug(`Creating new student '${student.username}'`);

    try {
        await student.save();
    } catch (err) {
        return sendCorrectError(res, err);
    }

    return res.json(student);
});

router.put("/:_id", isLoggedIn, async (req, res) => {
    if (!req.student?.isAdmin) {
        return sendError(res, "You're not an admin", UNAUTHORIZED);
    } else if (!isObjectId(req.params._id)) {
        return sendError(res, "Given _id is invalid");
    }

    const student = await Student.findOne({ _id: req.params._id }).exec();
    if (!student) {
        return sendError(res, "Student with given _id doesn't exist");
    }

    const studentReq = await sendStudentErrors(req, res, false);
    if (!isStudentReq(studentReq)) return;

    const { email, isAdmin, password, tests, username } = studentReq;

    const toUpdate: { [key: string]: any } = {};
    if (email) toUpdate.email = email;
    if (isAdmin) toUpdate.isAdmin = isAdmin;
    if (password) toUpdate.password = password;
    if (tests) toUpdate.tests = tests;
    if (username) toUpdate.username = username;

    logger.debug(`Updating student '${student.username}'`);

    try {
        await Student.updateOne({ _id: req.params._id }, toUpdate, {
            runValidators: true
        }).exec();
        const updatedStudent = await Student.findOne({
            _id: req.params._id
        }).exec();
        return res.json(updatedStudent);
    } catch (err) {
        return sendCorrectError(res, err);
    }
});

router.delete("/:_id", isLoggedIn, async (req, res) => {
    if (!req.student?.isAdmin) {
        return sendError(res, "You're not an admin", UNAUTHORIZED);
    } else if (!isObjectId(req.params._id)) {
        return sendError(res, "Given _id is invalid");
    }

    let student;
    try {
        student = await Student.findOne({ _id: req.params._id }).exec();
    } catch (err) {
        logger.error(err);
        return sendCorrectError(res, err);
    }
    if (!student) {
        return sendError(res, "Student with given _id doesn't exist");
    }

    // tests where the _id
    const tests = await Test.find({ _id: { $in: student.tests } }).exec();
    // await Student.deleteMany({tests: {$}})

    for (const test of tests) {
        logger.debug(`Pulling test ${test._id} from '${student.username}'`);
        (test as any).students.pull(student._id);
        try {
            await test.save();
        } catch (err) {
            return sendCorrectError(res, err);
        }
    }

    // If user just deleted his own account, log him out
    if (student._id.equals(req.student._id)) {
        logout(req, res);
    }

    logger.debug(`Deleting account '${student.username}'`);

    await student.deleteOne();

    return res.sendStatus(OK);
});

export default router;
