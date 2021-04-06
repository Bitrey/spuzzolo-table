import mongoose from "mongoose";
import { logger } from "../shared/logger";
mongoose.set("useNewUrlParser", true);
mongoose.set("useFindAndModify", false);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);

if (typeof process.env.MONGOOSE_URI !== "string") {
    logger.error("Missing MONGOOSE_URI env");
    process.exit(1);
}

import bcrypt from "bcryptjs";
import Student from "../models/Student";
async function prova() {
    const salt = bcrypt.genSaltSync(4);
    const hash = bcrypt.hashSync("diogatto", salt);
    await Student.create({
        createdAt: new Date(),
        isAdmin: true,
        tests: [],
        username: "BitreyGaming",
        email: "info@bitrey.it",
        password: hash
    });
    logger.debug("Creating a BitreyGaming");
}

mongoose.connect(process.env.MONGOOSE_URI, err => {
    err
        ? logger.error("MongoDB connection " + err)
        : logger.info("Connected to MongoDB");
    // prova();
});
