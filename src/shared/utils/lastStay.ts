/**
 * The stay dates and party size from the last hotel or homestay search, so a refreshed search and a listing opened
 * from the results start with them instead of empty. This browser tab only, like the checkout state.
 */
const KEY = 'gb.stay';
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const todayPk = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

export type LastStay = { checkIn: string; checkOut: string; guests: number };

export function readLastStay(): LastStay {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? '{}') ?? {};
    // Dates in the past are dropped; the party size still helps.
    const datesOk = DAY.test(saved.checkIn) && DAY.test(saved.checkOut) && saved.checkIn >= todayPk() && saved.checkOut > saved.checkIn;
    const guests = Number.isInteger(saved.guests) && saved.guests > 0 && saved.guests <= 30 ? saved.guests : 0;
    return { checkIn: datesOk ? saved.checkIn : '', checkOut: datesOk ? saved.checkOut : '', guests };
  } catch {
    return { checkIn: '', checkOut: '', guests: 0 };
  }
}

export function saveLastStay(stay: LastStay) {
  try { sessionStorage.setItem(KEY, JSON.stringify(stay)); } catch { /* storage unavailable: the listing starts empty */ }
}
