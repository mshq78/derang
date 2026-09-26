export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number
): { jy: number; jm: number; jd: number } {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];

  let jy = -1595 + 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }

  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }

  return { jy, jm, jd };
}

export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number
): { gy: number; gm: number; gd: number } {
  const jy2 = jy - 979;
  let days =
    365 * jy2 +
    Math.floor(jy2 / 33) * 8 +
    Math.floor(((jy2 % 33) + 3) / 4) +
    78;

  if (jm < 7) {
    days += (jm - 1) * 31;
  } else {
    days += (jm - 7) * 30 + 186;
  }
  days += jd - 1;

  let gy = 1600 + 400 * Math.floor(days / 146097);
  days %= 146097;

  let leap = true;
  if (days >= 36525) {
    days--;
    gy += 100 * Math.floor(days / 36524);
    days %= 36524;
    if (days >= 365) {
      days++;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(days / 1461);
  days %= 1461;

  if (days >= 366) {
    leap = false;
    days--;
    gy += Math.floor(days / 365);
    days %= 365;
  }

  const sal_a = [
    0,
    31,
    (leap ? 1 : 0) + 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  let gm = 0;
  while (gm < 12 && days >= sal_a[gm]) {
    days -= sal_a[gm];
    gm++;
  }
  const gd = days + 1;

  return { gy, gm, gd };
}

export function getCurrentJalaliDate(): { jy: number; jm: number; jd: number } {
  const now = new Date();
  return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function isoToJalali(isoString?: string): { jy: number; jm: number; jd: number } {
  if (!isoString) {
    return getCurrentJalaliDate();
  }
  const parts = isoString.split('-');
  if (parts.length >= 3) {
    const gy = parseInt(parts[0], 10);
    const gm = parseInt(parts[1], 10);
    const gd = parseInt(parts[2], 10);
    if (!isNaN(gy) && !isNaN(gm) && !isNaN(gd)) {
      return gregorianToJalali(gy, gm, gd);
    }
  }
  return getCurrentJalaliDate();
}

export function jalaliToIso(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}
