import {
    getModelForClass,
    modelOptions,
    prop,
    Ref
} from "@typegoose/typegoose";
import * as mongoose from "mongoose";

@modelOptions({ schemaOptions: { collection: "students" } })
export class StudentClass {
    @prop({ required: true, minlength: 1 })
    public username!: string;

    @prop({ required: false, minlength: 1 })
    public email?: string;

    @prop({ required: false })
    public password?: string;

    @prop({ required: true })
    public isAdmin!: boolean;

    @prop({ ref: "TestClass", required: true })
    public tests!: Ref<"TestClass">[];

    @prop({ required: true, default: Date.now })
    public createdAt!: Date;
}

const Student = getModelForClass(StudentClass);
export default Student;
