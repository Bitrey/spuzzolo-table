const { expect, assert } = require("chai");
const chai = require("chai");
const chaiHttp = require("chai-http");
const faker = require("faker");
const { OK, BAD_REQUEST, UNAUTHORIZED } = require("http-status");
require("dotenv").config();

chai.use(chaiHttp);
const agent = chai.request.agent(
    `http://localhost:${process.env.PORT || "3000"}`
);

function getUsername() {
    return faker.internet.userName().replace(/[\W_]+/g, "");
}

function randomUser(isAdmin) {
    if (typeof isAdmin !== "boolean") throw new Error("isAdmin not a bool");
    return {
        username: getUsername(),
        email: faker.internet.email().toLowerCase(),
        password: isAdmin ? faker.internet.password() : null,
        isAdmin,
        tests: []
    };
}

const testAccount = {
    username: "BitreyGaming",
    password: "diogatto"
};

const adminUser = randomUser(true);
const normalUser = randomUser(false);
let adminDB = null;
let studentDB = null;
let bitreyDB = null;

// console.log({ adminUser });

describe("Auth routes", () => {
    describe("Login with random credentials", () => {
        it("should return a 400", async () => {
            const res = await agent.post("/auth/login").send(adminUser);

            expect(res.body).to.have.property("err");
            expect(res).to.have.status(BAD_REQUEST);
        });
    });

    describe("Login as test account BitreyGaming", () => {
        it("should login", async () => {
            const res = await agent.post("/auth/login").send(testAccount);
            bitreyDB = res.body;

            expect(res.body).to.not.have.property("err");
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res).to.have.status(OK);
        });
    });

    describe("Create new admin", () => {
        it("should signup", async () => {
            const res = await agent.post("/auth/signup").send(adminUser);

            expect(res.body).to.not.have.property("err");
            adminDB = res.body;
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res).to.have.status(OK);
        });
    });

    describe("Create new normal user", () => {
        it("should signup", async () => {
            const res = await agent.post("/auth/signup").send(normalUser);

            expect(res.body).to.not.have.property("err");
            studentDB = res.body;
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res).to.have.status(OK);
        });
    });

    describe("Logout from BitreyGaming", () => {
        it("should return a 200", async () => {
            const res = await agent.get("/auth/logout");
            expect(res).to.have.status(OK);
        });
    });

    describe("Login as created admin", () => {
        it("should login", async () => {
            const res = await agent.post("/auth/login").send(adminUser);

            expect(res.body).to.not.have.property("err");
            expect(res.body)
                .to.have.property("isAdmin")
                .that.equals(adminUser.isAdmin);
            expect(res.body).to.have.property("_id").that.is.a("string");
            expect(res).to.have.status(OK);
        });
    });

    describe("Logout from admin", () => {
        it("should return a 200", async () => {
            const res = await agent.get("/auth/logout");

            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });

    describe("Login as created student", () => {
        it("shouldn't login (not an admin)", async () => {
            const res = await agent.post("/auth/login").send(normalUser);

            expect(res.body).to.have.property("err").that.is.a("string");
            expect(res).to.have.status(BAD_REQUEST);
        });
    });

    describe("Try to delete an account while NOT logged in", () => {
        it("shouldn't delete the account", async () => {
            const res = await agent.delete("/auth/" + adminDB._id);

            expect(res.body).to.have.property("err");
            expect(res).to.have.status(UNAUTHORIZED);
        });
    });

    describe("Login as test account BitreyGaming", () => {
        it("should login", async () => {
            const res = await agent.post("/auth/login").send(testAccount);

            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });

    describe("Update test admin", () => {
        it("should update just the username", async () => {
            const newName = getUsername();
            adminUser.username = newName;
            const res = await agent
                .put("/auth/" + adminDB._id)
                .send({ username: newName });

            adminDB = res.body;
            expect(res.body).to.not.have.property("err");
            expect(res.body).to.have.property("_id").that.equals(adminDB._id);
            expect(res.body)
                .to.have.property("email")
                .that.equals(adminDB.email);
            expect(res.body)
                .to.have.property("isAdmin")
                .that.equals(adminDB.isAdmin);
            expect(res.body)
                .to.have.property("password")
                .that.equals(adminDB.password);
            expect(res.body)
                .to.have.property("tests")
                .that.equals(adminDB.tests);
            expect(res.body).to.have.property("username").that.equals(newName);
            expect(res).to.have.status(OK);
        });
    });

    describe("Try to delete admin while logged in", () => {
        it("should delete the admin", async () => {
            const res = await agent.delete("/auth/" + adminDB._id);

            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });

    describe("Try to delete student while logged in", () => {
        it("should delete the student", async () => {
            const res = await agent.delete("/auth/" + studentDB._id);

            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });
});

function randomTest(written) {
    if (typeof written !== "boolean") throw new Error("written not a bool");
    const testType = written ? "written" : "oral";
    const additionalNotes = faker.datatype.boolean()
        ? faker.lorem.sentence()
        : undefined;
    return {
        subject: faker.lorem.word(),
        testType,
        students: [],
        additionalNotes,
        testDate: faker.date.future()
    };
}

const writtenTest = randomTest(true);
const oralTest = randomTest(false);
// console.log({ oralTest, adminDB });
let oralTestDB;
let writtenTestDB;

describe("Test routes", () => {
    describe("Create an oral test", () => {
        it(`should create a test with students`, async () => {
            oralTest.students = [bitreyDB?._id];

            const res = await agent.post("/test").send(oralTest);
            // console.log(res.body);
            expect(res.body).to.not.have.property("err");
            oralTestDB = res.body;
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res.body.subject).to.equal(oralTest.subject);
            expect(res.body.testType).to.equal(oralTest.testType);
            expect(res).to.have.status(OK);
        });
    });

    describe("Create a written test", () => {
        it(`should create a test without students`, async () => {
            const res = await agent.post("/test").send(writtenTest);
            // console.log(res.body);
            expect(res.body).to.not.have.property("err");
            writtenTestDB = res.body;
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res.body.subject).to.equal(writtenTest.subject);
            expect(res.body.testType).to.equal(writtenTest.testType);
            expect(res).to.have.status(OK);
        });
    });

    describe("Update oral test to written", () => {
        it(`should update to a written test`, async () => {
            const res = await agent
                .put("/test/" + oralTestDB._id)
                .send({ testType: "written" });
            expect(res.body).to.not.have.property("err");
            oralTestDB = res.body;
            oralTest.testType = "written";
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res.body).to.have.property("subject");
            expect(res.body.subject).to.equal(oralTest.subject);
            expect(res.body).to.have.property("testType");
            expect(res.body.testType).to.equal("written");
            expect(res).to.have.status(OK);
        });
    });

    describe("Update second written test to oral", () => {
        it(`should update to an oral test`, async () => {
            const res = await agent
                .put("/test/" + writtenTestDB._id)
                .send({ testType: "oral" });
            expect(res.body).to.not.have.property("err");
            writtenTestDB = res.body;
            writtenTest.testType = "oral";
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res.body).to.have.property("subject");
            expect(res.body.subject).to.equal(writtenTest.subject);
            expect(res.body).to.have.property("testType");
            expect(res.body.testType).to.equal("oral");
            expect(res).to.have.status(OK);
        });
    });

    describe("Logout", () => {
        it("should return a 200", async () => {
            const res = await agent.get("/auth/logout");
            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });

    describe("Delete a test while logged out", () => {
        it("shouldn't delete the test", async () => {
            const res = await agent.delete("/test/" + oralTestDB._id);
            expect(res.body).to.have.property("err");
            expect(res).to.have.status(UNAUTHORIZED);
        });
    });

    describe("Login as test account BitreyGaming", () => {
        it("should login", async () => {
            const res = await agent.post("/auth/login").send(testAccount);
            bitreyDB = res.body;

            expect(res.body).to.not.have.property("err");
            expect(res.body).to.have.property("_id");
            expect(res.body._id).to.be.a("string");
            expect(res).to.have.status(OK);
        });
    });

    describe("View all the tests", () => {
        it("should include both tests", async () => {
            const res = await agent.get("/test");
            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
            expect(res.body)
                .to.be.an("array")
                .that.satisfies(testArr =>
                    testArr.every(
                        test =>
                            test._id === oralTestDB._id ||
                            test._id == writtenTestDB._id
                    )
                );
        });
    });

    describe("Delete the first test", () => {
        it("should delete the test", async () => {
            const res = await agent.delete("/test/" + oralTestDB._id);
            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });

    describe("Find the second test by _id", () => {
        it("should return the test", async () => {
            const res = await agent.get("/test/" + writtenTestDB._id);

            expect(res.body).to.not.have.property("err");
            expect(res.body)
                .to.have.property("_id")
                .that.equals(writtenTestDB._id);
            expect(res).to.have.status(OK);
        });
    });

    describe("Find test by date (00:00)", () => {
        it("should return the test", async () => {
            const date = new Date(writtenTestDB.testDate);
            date.setHours(0);
            date.setMinutes(0);
            date.setSeconds(0);

            const res = await agent.get("/test/" + date.toISOString());

            expect(res.body).to.not.have.property("err");
            expect(res.body)
                .to.have.property("_id")
                .that.equals(writtenTestDB._id);
            expect(res).to.have.status(OK);
        });
    });

    describe("Find test by date (23:59)", () => {
        it("should return the test", async () => {
            const date = new Date(writtenTestDB.testDate);
            date.setHours(23);
            date.setMinutes(59);
            date.setSeconds(59);

            const res = await agent.get("/test/" + date.toISOString());

            expect(res.body).to.not.have.property("err");
            expect(res.body)
                .to.have.property("_id")
                .that.equals(writtenTestDB._id);
            expect(res).to.have.status(OK);
        });
    });

    describe("Delete the second test", () => {
        it("should delete the test", async () => {
            const res = await agent.delete("/test/" + writtenTestDB._id);
            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });

    describe("Logout", () => {
        it("should return a 200", async () => {
            const res = await agent.get("/auth/logout");
            expect(res.body).to.not.have.property("err");
            expect(res).to.have.status(OK);
        });
    });
});
