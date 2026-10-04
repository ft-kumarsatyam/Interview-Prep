/**
 * MySQL functions that LeetCode answers lean on, registered on every sql.js database so a MySQL-style
 * query runs unchanged on SQLite. Kept as a plain-JS string because it runs inside the SQL Web Worker;
 * tests evaluate the same source against Node's sql.js.
 */
export const SQL_COMPAT_SOURCE = String.raw`
function registerMysqlCompat(db) {
  const toDate = (v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    const t = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + "T00:00:00Z" : s.replace(" ", "T") + (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s) ? "" : "Z"));
    return Number.isNaN(t) ? null : new Date(t);
  };
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const part = (fn) => (v) => { const d = toDate(v); return d ? fn(d) : null; };

  db.create_function("IF", (cond, a, b) => (cond ? a : b));
  db.create_function("DATEDIFF", (a, b) => {
    const x = toDate(a), y = toDate(b);
    if (!x || !y) return null;
    return Math.round((Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()) - Date.UTC(y.getUTCFullYear(), y.getUTCMonth(), y.getUTCDate())) / 864e5);
  });
  db.create_function("ADDDATE", (v, days) => { const d = toDate(v); return d ? ymd(new Date(d.getTime() + Number(days) * 864e5)) : null; });
  db.create_function("SUBDATE", (v, days) => { const d = toDate(v); return d ? ymd(new Date(d.getTime() - Number(days) * 864e5)) : null; });
  db.create_function("YEAR", part((d) => d.getUTCFullYear()));
  db.create_function("MONTH", part((d) => d.getUTCMonth() + 1));
  db.create_function("DAY", part((d) => d.getUTCDate()));
  db.create_function("DAYOFMONTH", part((d) => d.getUTCDate()));
  db.create_function("DAYNAME", part((d) => DAYS[d.getUTCDay()]));
  db.create_function("MONTHNAME", part((d) => MONTHS[d.getUTCMonth()]));
  db.create_function("DATE_FORMAT", (v, fmt) => {
    const d = toDate(v);
    if (!d || fmt === null || fmt === undefined) return null;
    const map = {
      Y: () => String(d.getUTCFullYear()), y: () => pad(d.getUTCFullYear() % 100),
      m: () => pad(d.getUTCMonth() + 1), c: () => String(d.getUTCMonth() + 1),
      d: () => pad(d.getUTCDate()), e: () => String(d.getUTCDate()),
      M: () => MONTHS[d.getUTCMonth()], b: () => MONTHS[d.getUTCMonth()].slice(0, 3),
      W: () => DAYS[d.getUTCDay()], a: () => DAYS[d.getUTCDay()].slice(0, 3),
      H: () => pad(d.getUTCHours()), i: () => pad(d.getUTCMinutes()), s: () => pad(d.getUTCSeconds()),
      "%": () => "%",
    };
    return String(fmt).replace(/%(.)/g, (m, k) => (map[k] ? map[k]() : m));
  });
  db.create_function("LEAST", (a, b) => (a === null || b === null ? null : a < b ? a : b));
  db.create_function("GREATEST", (a, b) => (a === null || b === null ? null : a > b ? a : b));
  db.create_function("TRUNCATE", (x, n) => { if (x === null) return null; const f = 10 ** Number(n); return Math.trunc(Number(x) * f) / f; });
}
`;
