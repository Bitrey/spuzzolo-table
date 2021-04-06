import {
    getModelForClass,
    modelOptions,
    prop,
    Ref
} from "@typegoose/typegoose";
import * as mongoose from "mongoose";

@modelOptions({ schemaOptions: { collection: "tests" } })
export class TestClass {
    @prop({ required: true, minlength: 1 })
    public subject!: string;

    @prop({ required: true, enum: ["written", "oral"], addNullToEnum: false })
    public testType!: string;

    @prop({ ref: "StudentClass", required: true, default: [] })
    public students!: Ref<"StudentClass">[];

    @prop({ required: false })
    public additionalNotes?: string;

    @prop({ required: true })
    public testDate!: Date;

    @prop({ required: true, default: Date.now })
    public createdAt!: Date;
}

const Test = getModelForClass(TestClass);
export default Test;
