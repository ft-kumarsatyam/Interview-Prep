import { describe, expect, it } from "vitest";
import { parseArgs, parseShell, runMongo, type Collections } from "@/modules/dsa/domain/mongo-query";

const data: Collections = {
  users: [
    { _id: 1, name: "Asha", age: 31, city: "Pune", tags: ["a", "b"], address: { zip: "411001" } },
    { _id: 2, name: "Ben", age: 25, city: "Delhi", tags: ["b"], address: { zip: "110001" } },
    { _id: 3, name: "Chen", age: 40, city: "Pune", tags: [], address: { zip: "411002" } },
    { _id: 4, name: "Dev", age: 25, city: "Goa", tags: ["c", "a"] },
  ],
  orders: [
    { _id: 10, userId: 1, total: 100, items: [{ sku: "x", qty: 2 }, { sku: "y", qty: 1 }] },
    { _id: 11, userId: 1, total: 50, items: [{ sku: "x", qty: 1 }] },
    { _id: 12, userId: 3, total: 70, items: [] },
  ],
};

const docs = (src: string) => {
  const r = runMongo(src, data);
  if (!r.ok) throw new Error(r.error);
  return r.docs;
};

describe("relaxed argument parser", () => {
  it("reads unquoted keys, single quotes, trailing commas and regex", () => {
    expect(parseArgs("{ a: 1, 'b-c': 'x', d: [1, 2,], }")).toEqual([{ a: 1, "b-c": "x", d: [1, 2] }]);
    expect(parseArgs("{ name: /^a/i }")).toEqual([{ name: { $regex: "^a", $options: "i" } }]);
    expect(parseArgs("{}, { name: 1 }")).toHaveLength(2);
  });
  it("rejects code and prototype keys", () => {
    expect(() => parseArgs("{ a: process.exit() }")).toThrow();
    expect(() => parseArgs("{ __proto__: 1 }")).toThrow();
  });
});

describe("shell parsing", () => {
  it("chains methods and ignores comments and a trailing semicolon", () => {
    const q = parseShell("// users\ndb.users.find({ age: 1 }).sort({ age: 1 }).limit(2);");
    expect(q.collection).toBe("users");
    expect(q.ops.map((o) => o.name)).toEqual(["find", "sort", "limit"]);
  });
  it("needs db.<collection>", () => {
    expect(() => parseShell("users.find()")).toThrow(/db\./);
  });
});

describe("find", () => {
  it("filters with comparison and logical operators", () => {
    expect(docs("db.users.find({ age: { $gte: 30 } })").map((d) => (d as { name: string }).name)).toEqual(["Asha", "Chen"]);
    expect(docs("db.users.find({ $or: [{ city: 'Goa' }, { age: 40 }] })")).toHaveLength(2);
    expect(docs("db.users.find({ city: { $in: ['Pune', 'Goa'] }, age: { $lt: 35 } })")).toHaveLength(2);
    expect(docs("db.users.find({ city: { $ne: 'Pune' } })")).toHaveLength(2);
  });
  it("supports dotted paths, arrays, $exists, $size and regex", () => {
    expect(docs("db.users.find({ 'address.zip': '110001' })")).toHaveLength(1);
    expect(docs("db.users.find({ tags: 'a' })")).toHaveLength(2);
    expect(docs("db.users.find({ tags: { $all: ['a', 'b'] } })")).toHaveLength(1);
    expect(docs("db.users.find({ tags: { $size: 0 } })")).toHaveLength(1);
    expect(docs("db.users.find({ address: { $exists: false } })")).toHaveLength(1);
    expect(docs("db.users.find({ name: /^a/i })")).toHaveLength(1);
    expect(docs("db.orders.find({ items: { $elemMatch: { sku: 'x', qty: { $gt: 1 } } } })")).toHaveLength(1);
  });
  it("sorts, skips, limits and projects", () => {
    const r = docs("db.users.find({}, { name: 1, _id: 0 }).sort({ age: -1, name: 1 }).skip(1).limit(2)");
    expect(r).toEqual([{ name: "Asha" }, { name: "Ben" }]);
    expect(docs("db.users.find({ _id: 1 }, { tags: 0, address: 0, city: 0 })")).toEqual([{ _id: 1, name: "Asha", age: 31 }]);
  });
  it("counts and gets distinct values", () => {
    expect(docs("db.users.countDocuments({ city: 'Pune' })")).toEqual([2]);
    expect(docs("db.users.find({ age: 25 }).count()")).toEqual([2]);
    expect(docs("db.users.distinct('city')")).toEqual(["Delhi", "Goa", "Pune"]);
  });
});

describe("aggregate", () => {
  it("groups with accumulators", () => {
    const r = docs("db.users.aggregate([{ $group: { _id: '$city', n: { $sum: 1 }, avgAge: { $avg: '$age' } } }, { $sort: { n: -1, _id: 1 } }])");
    expect(r[0]).toEqual({ _id: "Pune", n: 2, avgAge: 35.5 });
    expect(r).toHaveLength(3);
  });
  it("unwinds and sums line items", () => {
    const r = docs("db.orders.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.sku', qty: { $sum: '$items.qty' } } }, { $sort: { _id: 1 } }])");
    expect(r).toEqual([{ _id: "x", qty: 3 }, { _id: "y", qty: 1 }]);
  });
  it("looks up a joined collection", () => {
    const r = docs("db.orders.aggregate([{ $match: { _id: 12 } }, { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'u' } }, { $project: { total: 1, who: '$u.name' } }])");
    expect(r).toEqual([{ _id: 12, total: 70, who: ["Chen"] }]);
  });
  it("computes fields and counts", () => {
    const r = docs("db.orders.aggregate([{ $addFields: { withTax: { $multiply: ['$total', 1.1] } } }, { $match: { withTax: { $gt: 100 } } }, { $count: 'n' }])");
    expect(r).toEqual([{ n: 1 }]);
  });
});

describe("errors", () => {
  it("explains problems instead of throwing", () => {
    expect(runMongo("db.nope.find()", data)).toMatchObject({ ok: false, error: expect.stringContaining("Available") });
    expect(runMongo("db.users.find({ age: { $weird: 1 } })", data)).toMatchObject({ ok: false, error: expect.stringContaining("$weird") });
    expect(runMongo("db.users.find({ a: ", data)).toMatchObject({ ok: false });
    expect(runMongo("db.users.drop()", data)).toMatchObject({ ok: false });
    expect(runMongo("db.users.aggregate([{ $out: 'x' }])", data)).toMatchObject({ ok: false });
  });
  it("does not mutate the source collections", () => {
    const before = JSON.stringify(data);
    docs("db.orders.aggregate([{ $unwind: '$items' }, { $addFields: { z: 1 } }])");
    docs("db.users.find({}, { tags: 0 })");
    expect(JSON.stringify(data)).toBe(before);
  });
});
