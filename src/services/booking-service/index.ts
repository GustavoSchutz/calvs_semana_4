import hotelRepository from "@/repositories/hotel-repository";
import enrollmentRepository from "@/repositories/enrollment-repository";
import ticketRepository from "@/repositories/ticket-repository";
import { notFoundError } from "@/errors";
import { cannotListBookingError } from "@/errors/cannot-list-bookings-error";
import bookingRepository from "@/repositories/booking-repository";
import { roomCapacityError } from "./errors";

async function listBooking(userId: number) {

    const enrollment = await enrollmentRepository.findWithAddressByUserId(userId);
    if (!enrollment) {
        throw notFoundError();
    }
    const ticket = await ticketRepository.findTicketByEnrollmentId(enrollment.id);

    if (!ticket || ticket.status === "RESERVED" || ticket.TicketType.isRemote || !ticket.TicketType.includesHotel) {
        throw cannotListBookingError();
    }

}

async function checkRoom(roomId: number) {
    const room = await hotelRepository.findRoomById(roomId)
    if (!room) {
        throw notFoundError();
    }

    const roomBookings = await bookingRepository.findBookingsByRoomId(roomId);

    if (room.capacity === roomBookings.length) {
        throw roomCapacityError();
    }
}

async function getBooking(userId: number) {
    await listBooking(userId);

    const booking = await bookingRepository.findUserBooking(userId);
    if (!booking) {
        throw notFoundError();
    }
    return booking;
}

async function postBooking(userId: number, roomId: number) {
    await checkRoom(roomId);
    await listBooking(userId);
    const booking = await bookingRepository.findUserBooking(userId);

    if (booking) {
        throw cannotListBookingError();
    }

    const createBooking = await bookingRepository.createBooking(userId, roomId);

    return createBooking;

}

async function updateBooking(userId: number, roomId: number, bookingId: number) {
    await checkRoom(roomId);
    await listBooking(userId);
    const booking = await bookingRepository.findUserBooking(userId);
    if (!(booking.id === bookingId)) {
        throw cannotListBookingError();
    }

    const createBooking = await bookingRepository.createBooking(userId, roomId);

    if (!createBooking) {
        throw cannotListBookingError();
    } else {
        const deleteBooking = await bookingRepository.deleteBooking(bookingId);
    }
    return createBooking;
}


const bookingService = {
    getBooking,
    postBooking,
    updateBooking,
};

export default bookingService;
