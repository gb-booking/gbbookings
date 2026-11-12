import type { ClientSession, Types } from 'mongoose';
import { inTransaction } from '../../database/transaction.js';
import { BookingModel, type BookingStatus } from '../../models/booking.model.js';
import { HotelRoomTypeModel } from '../../models/hotel-room-type.model.js';
import { RoomNightModel } from '../../models/room-night.model.js';
import { AppError } from '../../shared/app-error.js';
import { stayNights, todayInPakistan } from './stay-dates.js';

// Every status except cancelled keeps its rooms (see `transitions` in booking.service).
const HOLDING_STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'no_show'];

/**
 * Scheduled daily: recounts `booked` for today onwards from the bookings themselves and corrects any counter that
 * differs, so a wrong counter cannot block a cancellation for good. Each room is checked in one transaction that also
 * touches the room, which makes it wait for a booking or change in progress on that room.
 */
export async function recountRoomNights(today = todayInPakistan()) {
  const roomIds = new Map<string, Types.ObjectId>();
  for (const id of [
    ...await RoomNightModel.distinct('roomTypeId', { date: { $gte: today }, booked: { $gt: 0 } }),
    ...await BookingModel.distinct('roomTypeId', { status: { $in: HOLDING_STATUSES }, checkOut: { $gt: today } }),
  ]) roomIds.set(String(id), id as Types.ObjectId);

  let corrected = 0;
  for (const roomTypeId of roomIds.values()) {
    corrected += await inTransaction(async (session) => {
      await HotelRoomTypeModel.updateOne({ _id: roomTypeId }, { $inc: { inventoryVersion: 1 } }, { session });
      const bookings = await BookingModel.find({ roomTypeId, status: { $in: HOLDING_STATUSES }, checkOut: { $gt: today } }).select('checkIn checkOut rooms').session(session).lean() as any[];
      const expected = new Map<string, number>();
      for (const booking of bookings) {
        for (const night of stayNights(booking.checkIn, booking.checkOut, booking.checkIn)) {
          if (night >= today) expected.set(night, (expected.get(night) ?? 0) + booking.rooms);
        }
      }
      const counters = await RoomNightModel.find({ roomTypeId, date: { $gte: today } }).select('date booked').session(session).lean() as any[];
      const actual = new Map<string, number>(counters.map((counter) => [counter.date, counter.booked]));
      const wrong = [...new Set([...expected.keys(), ...actual.keys()])].filter((date) => (expected.get(date) ?? 0) !== (actual.get(date) ?? 0));
      for (const date of wrong) {
        console.warn(`Room-night counter corrected: room ${roomTypeId} on ${date} said ${actual.get(date) ?? 0} booked, bookings say ${expected.get(date) ?? 0}.`);
        await RoomNightModel.updateOne({ roomTypeId, date }, { $set: { booked: expected.get(date) ?? 0 } }, { upsert: true, session });
      }
      return wrong.length;
    });
  }
  return corrected;
}

type RoomRef = { _id: Types.ObjectId; totalRooms: number };

/** Rooms still free on every night of the stay, keyed by room type _id. */
export async function availableRoomCounts(roomTypes: RoomRef[], nights: string[]) {
  const counters = await RoomNightModel.find({
    roomTypeId: { $in: roomTypes.map((room) => room._id) },
    date: { $in: nights },
  }).select('roomTypeId booked closed synced').lean();

  const peakBooked = new Map<string, number>();
  for (const counter of counters as any[]) {
    const key = String(counter.roomTypeId);
    peakBooked.set(key, Math.max(peakBooked.get(key) ?? 0, counter.booked + (counter.closed ?? 0) + (counter.synced ?? 0)));
  }
  return new Map(roomTypes.map((room) => [
    String(room._id),
    Math.max(0, room.totalRooms - (peakBooked.get(String(room._id)) ?? 0)),
  ]));
}

/** Days from `from` to `to` with nothing free in any of these rooms: booked out or closed by the partner. */
export async function fullyBookedDates(roomTypes: RoomRef[], from: string, to: string) {
  const counters = await RoomNightModel.find({ roomTypeId: { $in: roomTypes.map((room) => room._id) }, date: { $gte: from, $lte: to } }).select('roomTypeId date booked closed synced').lean() as any[];
  const totals = new Map(roomTypes.map((room) => [String(room._id), room.totalRooms]));
  const allRooms = roomTypes.reduce((sum, room) => sum + room.totalRooms, 0);
  const taken = new Map<string, number>();
  for (const counter of counters) {
    const used = Math.min(totals.get(String(counter.roomTypeId)) ?? 0, counter.booked + (counter.closed ?? 0) + (counter.synced ?? 0));
    taken.set(counter.date, (taken.get(counter.date) ?? 0) + used);
  }
  return [...taken].filter(([, used]) => used >= allRooms).map(([date]) => date).sort();
}

export async function releaseRooms(roomTypeId: Types.ObjectId, nights: string[], quantity: number, session: ClientSession) {
  if (!nights.length) return;
  const result = await RoomNightModel.updateMany(
    { roomTypeId, date: { $in: nights }, booked: { $gte: quantity } },
    { $inc: { booked: -quantity } }, { session },
  );
  if (result.modifiedCount !== nights.length) {
    throw new AppError(409, 'INVENTORY_INCONSISTENT', 'Inventory could not be released safely. Please contact support.');
  }
}

/** True if any future night already uses more rooms (booked + closed + synced) than `totalRooms`. */
export async function inventoryExceeds(roomTypeId: Types.ObjectId, totalRooms: number, fromDate: string, session?: ClientSession) {
  return Boolean(await RoomNightModel.exists({
    roomTypeId, date: { $gte: fromDate },
    $expr: { $gt: [{ $add: ['$booked', { $ifNull: ['$closed', 0] }, { $ifNull: ['$synced', 0] }] }, totalRooms] },
  }).session(session ?? null));
}

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

/** Initialize empty counters outside the transaction. Concurrent inserts are harmless. */
export async function prepareRoomNights(roomTypeId: Types.ObjectId, nights: string[]) {
  for (const date of nights) {
    try {
      await RoomNightModel.updateOne({ roomTypeId, date }, { $setOnInsert: { booked: 0 } }, { upsert: true });
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  }
}

/** Reserve every night within the same transaction as the booking record. */
export async function reserveRooms(room: RoomRef, nights: string[], quantity: number, session: ClientSession) {
  const unavailable = () => new AppError(409, 'ROOM_UNAVAILABLE', 'Not enough rooms are available for the selected dates.');
  if (quantity > room.totalRooms) throw unavailable();

  for (const date of nights) {
    const result = await RoomNightModel.updateOne(
      { roomTypeId: room._id, date, $expr: { $lte: [{ $add: ['$booked', { $ifNull: ['$closed', 0] }, { $ifNull: ['$synced', 0] }, quantity] }, room.totalRooms] } },
      { $inc: { booked: quantity } }, { session },
    );
    if (result.modifiedCount !== 1) throw unavailable();
  }
}
