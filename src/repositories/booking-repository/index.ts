import { prisma } from "@/config";

async function findUserBooking(userId: number) {
    return prisma.booking.findFirst({
        where: {
            userId,
        },
        select: {
            id: true,
            Room: {
                select: {
                    id: true,
                    name: true,
                    capacity: true,
                    hotelId: true,
                    createdAt: true,
                    updatedAt: true,
                }
            }
        }
    });
}

async function findBookingsByRoomId(roomId: number) {
    return prisma.booking.findMany({
        where: {
            roomId: roomId
        }
    })
}

async function createBooking(userId: number, roomId: number) {
    return prisma.booking.create({
        data: {
            roomId,
            userId
        }
    })
}

async function deleteBooking(bookingId: number) {
    return prisma.booking.delete({
        where: {
            id: bookingId
        }
    })
}

const bookingRepository = {
    findUserBooking,
    createBooking,
    findBookingsByRoomId,
    deleteBooking,
}

export default bookingRepository;