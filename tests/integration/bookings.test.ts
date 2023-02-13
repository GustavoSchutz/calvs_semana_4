import app, { init } from "@/app";
import { prisma } from "@/config";
import faker from "@faker-js/faker";
import { TicketStatus } from "@prisma/client";
import e from "express";
import httpStatus from "http-status";
import * as jwt from "jsonwebtoken";
import supertest from "supertest";
import {
    createEnrollmentWithAddress,
    createUser,
    createTicketType,
    createTicket,
    createPayment,
    generateCreditCardData,
    createTicketTypeWithHotel,
    createTicketTypeRemote,
    createHotel,
    createRoomWithHotelId,
    createSingleBedRoomWithHotelId,
} from "../factories";
import { createBooking } from "../factories/bookings-factory";
import { cleanDb, generateValidToken } from "../helpers";

beforeAll(async () => {
    await init();
});

beforeEach(async () => {
    await cleanDb();
});

const server = supertest(app);

describe("GET /booking", () => {
    it("should respond with status 401 if no token is given", async () => {
        const response = await server.get("/booking");

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if given token is not valid", async () => {
        const token = faker.lorem.word();

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    describe("when token is valid", () => {
        it("should respond with status 402 when user ticket is remote ", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeRemote();
            const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
            const payment = await createPayment(ticket.id, ticketType.price);
            //Hoteis no banco

            const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.PAYMENT_REQUIRED);
        });

        it("should respond with status 404 when user has no enrollment ", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);

            const ticketType = await createTicketTypeRemote();

            const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it("should respond with status 200 and booking data", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            const ticket = await createTicket(enrollment.id, ticketType.id, TicketStatus.PAID);
            const payment = await createPayment(ticket.id, ticketType.price);

            const createdHotel = await createHotel();
            const room = await createRoomWithHotelId(createdHotel.id);
            const booking = await createBooking(user.id, room.id)
            const response = await server.get("/booking").set("Authorization", `Bearer ${token}`);

            expect(response.status).toEqual(httpStatus.OK);

            expect(response.body).toEqual(
                {
                    id: booking.id,
                    Room: {
                        id: room.id,
                        name: room.name,
                        capacity: room.capacity,
                        hotelId: createdHotel.id,
                        createdAt: room.createdAt.toISOString(),
                        updatedAt: room.updatedAt.toISOString(),
                    }
                }
            );
        });
    });
});

function createBody() {
    return {
        roomId: 1
    }
}

describe("PUT /booking/:bookingId", () => {
    it("should respond with status 401 if no token is given", async () => {
        const body = createBody();
        const response = await server.put("/booking/1").send(body);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if given token is not valid", async () => {
        const token = faker.lorem.word();
        const body = createBody();

        const response = await server.get("/booking/1").set("Authorization", `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const body = createBody();
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);

        const response = await server.get("/booking/1").set("Authorization", `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    describe("when token is valid", () => {
        //booking foi excluido
        //booking foi criado (200 booking Id)
        //usuário tem reserva
        //novo quarto é livre?
        //o quarto novo existe?

        it("should respond with status 404 when there is no room with given Id ", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            const ticket = await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createRoomWithHotelId(hotel.id);
            const booking = await createBooking(user.id, room.id);


            const response = await server
                .put(`/booking/${booking.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: room.id + 1 });

            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it("should respond with status 403 when room is at full capacity ", async () => {
            const fakeUser = await createUser();
            const fakeToken = await generateValidToken(fakeUser);
            const fakeEnrollment = await createEnrollmentWithAddress(fakeUser);
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            const fakeTicket = await createTicket(fakeEnrollment.id, ticketType.id, "PAID");
            const ticket = await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createSingleBedRoomWithHotelId(hotel.id);
            const fakeRoom = await createSingleBedRoomWithHotelId(hotel.id);
            await createBooking(fakeUser.id, room.id);
            const booking = await createBooking(user.id, fakeRoom.id);

            const response = await server
                .put(`/booking/${booking.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: room.id });

            expect(response.status).toEqual(httpStatus.FORBIDDEN);
        });

        it("should respond with status 200 and with bookingId", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createRoomWithHotelId(hotel.id);
            const booking = await createBooking(user.id, room.id)
            const newRoom = await createRoomWithHotelId(hotel.id);

            const response = await server
                .put(`/booking/${booking.id}`)
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: newRoom.id });

            expect(response.status).toEqual(httpStatus.OK);
            expect(response.body).toEqual({
                bookingId: expect.any(Number)
            });
        });//atual

    });
});

describe("POST /booking", () => {
    it("should respond with status 401 if no token is given", async () => {
        const body = createBody();
        const response = await server.post("/booking").send(body);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if given token is not valid", async () => {
        const token = faker.lorem.word();
        const body = createBody();


        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    it("should respond with status 401 if there is no session for given token", async () => {
        const userWithoutSession = await createUser();
        const token = jwt.sign({ userId: userWithoutSession.id }, process.env.JWT_SECRET);
        const body = createBody();


        const response = await server.post("/booking").set("Authorization", `Bearer ${token}`).send(body);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
    });

    describe("when token is valid", () => {

        it("should respond with status 404 when there is no room with given Id ", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            const ticket = await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createRoomWithHotelId(hotel.id);

            const response = await server
                .post("/booking")
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: room.id + 1 });

            expect(response.status).toEqual(httpStatus.NOT_FOUND);
        });

        it("should respond with status 403 when user is already booked", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            const ticket = await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createSingleBedRoomWithHotelId(hotel.id);
            await createBooking(user.id, room.id);

            const response = await server
                .post("/booking")
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: room.id });

            expect(response.status).toEqual(httpStatus.FORBIDDEN);
        });


        it("should respond with status 403 when room is at full capacity ", async () => {
            const fakeUser = await createUser();
            const fakeToken = await generateValidToken(fakeUser);
            const fakeEnrollment = await createEnrollmentWithAddress(fakeUser);
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            const fakeTicket = await createTicket(fakeEnrollment.id, ticketType.id, "PAID");
            const ticket = await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createSingleBedRoomWithHotelId(hotel.id);
            await createBooking(fakeUser.id, room.id);

            const response = await server
                .post("/booking")
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: room.id });

            expect(response.status).toEqual(httpStatus.FORBIDDEN);
        });

        it("should respond with status 201 and with bookingId", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createRoomWithHotelId(hotel.id);

            const response = await server
                .post("/booking")
                .set("Authorization", `Bearer ${token}`)
                .send({ roomId: room.id });

            expect(response.status).toEqual(httpStatus.CREATED);
            expect(response.body).toEqual({
                bookingId: expect.any(Number)
            });
        });
        it("should insert a new booking in the database", async () => {
            const user = await createUser();
            const token = await generateValidToken(user);
            const enrollment = await createEnrollmentWithAddress(user);
            const ticketType = await createTicketTypeWithHotel();
            await createTicket(enrollment.id, ticketType.id, "PAID");
            const hotel = await createHotel();
            const room = await createRoomWithHotelId(hotel.id);

            const beforeCount = await prisma.booking.count();

            await server.post("/booking").set("Authorization", `Bearer ${token}`).send({ roomId: room.id });

            const afterCount = await prisma.booking.count();

            expect(beforeCount).toEqual(0);
            expect(afterCount).toEqual(1);
        });   //teste atual
    });
});
