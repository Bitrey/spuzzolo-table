import { mongoose } from "@typegoose/typegoose";
import { Request, Response } from "express";
import moment from "moment";
import { AsyncValidation, Validation } from "..";
import Student from "../../models/Student";
import { isObjectId, logger, sendError } from "../../shared";

interface TestReq {
    createdAt?: Date;
    students?: mongoose.Types.ObjectId[];
    subject?: string;
    testDate?: Date;
    testType?: "written" | "oral";
    additionalNotes?: string | null;
}

export function isTestReq(test: unknown): test is TestReq {
    return !!test;
}

function _getStudentsArr(students: unknown): string[] | null {
    if (Array.isArray(students)) return students;
    try {
        const parsed = JSON.parse(students as any);
        return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
        return null;
    }
}

async function _studentsValidator(studentIds: unknown): AsyncValidation {
    const _ids = _getStudentsArr(studentIds);
    if (!_ids) return "Invalid 'students' param";
    else if (!_ids.every(_id => isObjectId(_id))) {
        logger.debug("Bad ObjectId in _ids.every loop");
        return "Some of the specified 'students' are invalid";
    }

    for (const _id of _ids) {
        if (!(await Student.exists({ _id }))) {
            logger.debug(`_studentsValidator: non-existent student '${_id}'`);
            return "Some of the specified 'students' are invalid";
        }
    }

    return null;
}

function _subjectValidator(subject: unknown): Validation {
    if (typeof subject !== "string") return "Invalid 'subject' param";
    else if (subject.length < 1) return "'subject' must be at least 1 char";
    return null;
}

export function dateValidator(testDate: unknown): Validation {
    if (!testDate) return "Invalid 'testDate' param";
    else if (!moment(testDate as any).isValid()) {
        return "Given 'testDate' is not a valid date";
    } // else if (moment(testDate as any).isBefore()) {
    //     return "'testDate' date can't be in the past";
    // }
    return null;
}

function _testTypeValidator(testType: unknown): Validation {
    if (testType !== "written" && testType !== "oral") {
        return "Invalid 'testType' param";
    } else return null;
}

export async function sendTestErrors(
    req: Request,
    res: Response,
    newDoc: boolean
): Promise<TestReq | false> {
    const { students, subject, testDate, testType, additionalNotes } = req.body;

    const studentsErr = await _studentsValidator(students);
    const subjectErr = _subjectValidator(subject);
    const testDateErr = dateValidator(testDate);
    const testTypeErr = _testTypeValidator(testType);

    // Check if correct
    if (newDoc) {
        if (studentsErr) return sendError(res, studentsErr), false;
        else if (subjectErr) return sendError(res, subjectErr), false;
        else if (testDateErr) return sendError(res, testDateErr), false;
        else if (testTypeErr) return sendError(res, testTypeErr), false;
    } else {
        if (students && studentsErr) return sendError(res, studentsErr), false;
        else if (subject && subjectErr)
            return sendError(res, subjectErr), false;
        else if (testDate && testDateErr)
            return sendError(res, testDateErr), false;
        else if (testType && testTypeErr)
            return sendError(res, testTypeErr), false;
    }

    return {
        additionalNotes,
        createdAt: new Date(),
        students: students ? (_getStudentsArr(students) as any[]) : undefined,
        subject,
        testDate: testDate ? moment(testDate).toDate() : undefined,
        testType
    };
}
