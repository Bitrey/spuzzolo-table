import {
    DocumentType,
    isDocumentArray,
    isRefType,
    mongoose
} from "@typegoose/typegoose";
import { Router } from "express";
import { OK, UNAUTHORIZED } from "http-status";
import moment from "moment";
import { isLoggedIn } from "../../middleware/isLoggedIn";
import { StudentClass } from "../../models/Student";
import Test from "../../models/Test";
import { isObjectId, logger, sendCorrectError, sendError } from "../../shared";
import { dateValidator, isTestReq, sendTestErrors } from "./functions";

const router = Router();

router.get("/", async (req, res) => {
    try {
        const tests = await Test.find({}).exec();
        res.json(tests);
    } catch (err) {
        return sendCorrectError(res, err);
    }
});

// Find by _id or date
router.get("/:date", async (req, res) => {
    let query;

    if (isObjectId(req.params.date)) {
        logger.debug(req.params.date + " is a valid ObjectId");
        query = { _id: req.params.date };
    } else {
        logger.debug(req.params.date + " is NOT a valid ObjectId");
        if (dateValidator(req.params.date)) {
            return sendError(res, "Given 'date' is not a valid date");
        }

        const date = moment(req.params.date).toDate();

        const dayStr = `${
            date.getMonth() + 1
        }/${date.getDate()}/${date.getFullYear()}`;
        const startDate = new Date(dayStr + " 00:00");
        const endDate = new Date(dayStr + " 23:59");

        query = { testDate: { $gte: startDate, $lte: endDate } };
    }

    try {
        // console.log(query);
        const tests = await Test.findOne(query).exec();
        res.json(tests);
    } catch (err) {
        return sendCorrectError(res, err);
    }
});

router.post("/", isLoggedIn, async (req, res) => {
    if (!req.student?.isAdmin) {
        return sendError(res, "You're not an admin", UNAUTHORIZED);
    }

    const testReq = await sendTestErrors(req, res, true);
    if (!isTestReq(testReq)) return;

    const { subject, testDate } = req.body;

    if (await Test.exists({ subject, testDate })) {
        return sendError(res, "Test already exists"), false;
    }

    const test = new Test(testReq);

    await test.populate("students").execPopulate();
    (test.students as any[]).forEach(s => s.tests.push(test._id));

    logger.debug(`Creating new test '${test._id}'`);

    try {
        await test.save();
        for (const student of test.students) {
            logger.debug(`Test ${test._id} -> '${(student as any).username}'`);
            await (student as any).save();
        }
    } catch (err) {
        return sendCorrectError(res, err);
    }

    return res.json(test);
});

// CAN'T be used for allowing students of test
router.put("/:_id", isLoggedIn, async (req, res) => {
    if (!req.student?.isAdmin) {
        return sendError(res, "You're not an admin", UNAUTHORIZED);
    } else if (!isObjectId(req.params._id)) {
        return sendError(res, "Given _id is invalid");
    }

    const test = await Test.findOne({ _id: req.params._id }).exec();
    if (!test) {
        return sendError(res, "Test with given _id doesn't exist");
    }

    const testReq = await sendTestErrors(req, res, false);
    if (!isTestReq(testReq)) return;

    const { subject, testDate, testType, additionalNotes } = testReq;

    const toUpdate: { [key: string]: any } = {};
    if (subject) toUpdate.subject = subject;
    if (testDate) toUpdate.testDate = testDate;
    if (testType) toUpdate.testType = testType;
    if (additionalNotes) toUpdate.additionalNotes = additionalNotes;

    try {
        await Test.updateOne({ _id: req.params._id }, toUpdate, {
            runValidators: true
        }).exec();
        const updatedTest = await Test.findOne({ _id: req.params._id }).exec();
        return res.json(updatedTest);
    } catch (err) {
        return sendCorrectError(res, err);
    }
});

router.delete("/:_id", async (req, res) => {
    if (!req.student?.isAdmin) {
        return sendError(res, "You're not an admin", UNAUTHORIZED);
    } else if (!isObjectId(req.params._id)) {
        return sendError(res, "Given _id is invalid");
    }

    const test = await Test.findOne({ _id: req.params._id }).exec();
    if (!test) {
        return sendError(res, "Test with given _id doesn't exist");
    }

    if (!isDocumentArray(test.students)) {
        await test.populate("students").execPopulate();
    }

    if (Array.isArray(test.students)) {
        const testStudents: DocumentType<StudentClass>[] = test.students as any[];
        for (const student of testStudents) {
            // In theory, mongoose arrays should have a 'pull' property
            logger.debug(`Pulling test ${test._id} from ${student.username}`);
            (student.tests as any).pull(test._id);
            try {
                await student.save();
            } catch (err) {
                return sendCorrectError(res, err);
            }
        }
    } else logger.debug("test.students is not an array");

    logger.debug(`Deleting test '${test._id}'`);

    await test.deleteOne();

    return res.sendStatus(OK);
});

export default router;
