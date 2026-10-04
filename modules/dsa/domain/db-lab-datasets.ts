/**
 * More DB Lab datasets. Each is small enough to reason about by hand and has the awkward rows interviews rely on: ties,
 * NULLs, a parent with no children, a gap in a run of dates. Original data, written for PrepOS.
 */
import type { MongoDataset, SqlDataset } from "@/modules/dsa/domain/db-lab";

export const EXTRA_SQL_DATASETS: readonly SqlDataset[] = [
  {
    id: "school",
    label: "School",
    blurb: "Students, teachers, courses and scored enrollments (some scores missing).",
    seed: `CREATE TABLE teachers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, dept TEXT NOT NULL);
CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT NOT NULL, teacher_id INTEGER REFERENCES teachers(id), credits INTEGER NOT NULL);
CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT NOT NULL, grade_level INTEGER NOT NULL, city TEXT, born TEXT NOT NULL);
CREATE TABLE enrollments (student_id INTEGER NOT NULL REFERENCES students(id), course_id INTEGER NOT NULL REFERENCES courses(id), term TEXT NOT NULL, score INTEGER, PRIMARY KEY (student_id, course_id, term));
INSERT INTO teachers VALUES (1,'Dr. Rao','Math'),(2,'Ms. Lin','Science'),(3,'Mr. Okafor','English'),(4,'Mrs. Silva','Math');
INSERT INTO courses VALUES (1,'Algebra',1,4),(2,'Geometry',4,3),(3,'Physics',2,4),(4,'Chemistry',2,4),(5,'Literature',3,3),(6,'Poetry',3,2),(7,'Statistics',NULL,3);
INSERT INTO students VALUES (1,'Aarav',10,'Pune','2009-03-14'),(2,'Bella',10,'Austin','2009-11-02'),(3,'Chen',11,'Pune','2008-07-21'),(4,'Diya',11,'Delhi','2008-01-30'),(5,'Emil',12,'Berlin','2007-05-05'),(6,'Fatima',12,'Dubai','2007-12-12'),(7,'Gus',10,NULL,'2009-08-08'),(8,'Hana',11,'Austin','2008-09-09'),(9,'Ivo',12,'Berlin','2007-02-28'),(10,'Jia',10,'Pune','2009-06-18'),(11,'Kofi',11,'Delhi','2008-10-10'),(12,'Lena',12,'Dubai','2007-04-04');
INSERT INTO enrollments VALUES
 (1,1,'2024F',88),(1,3,'2024F',92),(1,5,'2024F',75),
 (2,1,'2024F',64),(2,2,'2024F',70),(2,5,'2024F',NULL),
 (3,1,'2024F',95),(3,3,'2024F',81),(3,4,'2024S',77),
 (4,2,'2024F',58),(4,5,'2024F',90),(4,6,'2024S',85),
 (5,3,'2024F',72),(5,4,'2024S',72),(5,7,'2024S',66),
 (6,1,'2024F',99),(6,3,'2024S',94),(6,6,'2024S',NULL),
 (8,2,'2024F',83),(8,4,'2024F',79),
 (9,5,'2024F',60),(9,7,'2024S',88),
 (10,1,'2024S',91),(10,2,'2024S',89),
 (11,3,'2024F',55),
 (12,4,'2024S',97);`,
  },
  {
    id: "bank",
    label: "Bank",
    blurb: "Customers, accounts and a ledger of deposits (positive) and withdrawals (negative).",
    seed: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, joined TEXT NOT NULL);
CREATE TABLE accounts (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), type TEXT NOT NULL, opened TEXT NOT NULL);
CREATE TABLE transactions (id INTEGER PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id), amount INTEGER NOT NULL, txn_date TEXT NOT NULL, category TEXT);
INSERT INTO customers VALUES (1,'Maya','Pune','2020-01-15'),(2,'Noah','Austin','2021-05-20'),(3,'Olga','Berlin','2019-11-03'),(4,'Pablo','Delhi','2022-02-14'),(5,'Quinn','Austin','2023-07-01'),(6,'Rhea','Pune','2018-09-09'),(7,'Sven','Berlin','2024-01-02');
INSERT INTO accounts VALUES (1,1,'checking','2020-01-15'),(2,1,'savings','2020-03-01'),(3,2,'checking','2021-05-20'),(4,3,'checking','2019-11-03'),(5,3,'savings','2020-01-10'),(6,4,'checking','2022-02-14'),(7,5,'savings','2023-07-01'),(8,6,'checking','2018-09-09'),(9,6,'savings','2019-02-02');
INSERT INTO transactions VALUES
 (1,1,3000,'2024-01-01','salary'),(2,1,-1200,'2024-01-03','rent'),(3,1,-150,'2024-01-05','food'),(4,1,-80,'2024-01-09','food'),
 (5,2,500,'2024-01-10','transfer'),(6,1,3000,'2024-02-01','salary'),(7,1,-1200,'2024-02-03','rent'),(8,1,-210,'2024-02-14','food'),
 (9,3,2500,'2024-01-02','salary'),(10,3,-900,'2024-01-04','rent'),(11,3,-60,'2024-01-20',NULL),(12,3,2500,'2024-02-02','salary'),
 (13,3,-900,'2024-02-04','rent'),(14,3,-300,'2024-02-20','food'),(15,4,4000,'2024-01-01','salary'),(16,4,-1500,'2024-01-05','rent'),
 (17,5,1000,'2024-01-15','transfer'),(18,4,-400,'2024-02-10','food'),(19,4,4000,'2024-02-01','salary'),(20,4,-1500,'2024-02-05','rent'),
 (21,6,1800,'2024-01-03','salary'),(22,6,-700,'2024-01-06','rent'),(23,6,-95,'2024-01-18','food'),(24,7,250,'2024-03-01','transfer'),
 (25,8,5000,'2024-01-01','salary'),(26,8,-2000,'2024-01-07','rent'),(27,9,1500,'2024-01-12','transfer'),(28,8,-120,'2024-03-05','food'),
 (29,3,2500,'2024-03-02','salary'),(30,3,-900,'2024-03-04','rent');`,
  },
  {
    id: "streaming",
    label: "Music streaming",
    blurb: "Users, songs and play events over ten days in March 2024.",
    seed: `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, plan TEXT NOT NULL, country TEXT NOT NULL, signup TEXT NOT NULL);
CREATE TABLE songs (id INTEGER PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, genre TEXT NOT NULL, seconds INTEGER NOT NULL);
CREATE TABLE plays (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), song_id INTEGER NOT NULL REFERENCES songs(id), played_on TEXT NOT NULL, completed INTEGER NOT NULL);
INSERT INTO users VALUES (1,'Ava','premium','US','2023-01-10'),(2,'Ben','free','IN','2023-02-15'),(3,'Cara','premium','UK','2023-03-20'),(4,'Dev','free','IN','2023-05-01'),(5,'Eli','free','US','2023-06-12'),(6,'Fay','premium','DE','2023-08-30'),(7,'Gio','free','IT','2024-01-05'),(8,'Hope','premium','US','2024-02-01');
INSERT INTO songs VALUES (1,'Sunrise','Aurora','pop',210),(2,'Night Drive','Aurora','pop',245),(3,'Concrete','Basalt','rock',190),(4,'Echoes','Basalt','rock',320),(5,'Lagoon','Cobalt','jazz',280),(6,'Blue Hour','Cobalt','jazz',300),(7,'Static','Dune','electronic',200),(8,'Pulse','Dune','electronic',180),(9,'Solo','Aurora','pop',150);
INSERT INTO plays VALUES
 (1,1,1,'2024-03-01',1),(2,1,2,'2024-03-01',1),(3,1,1,'2024-03-02',1),(4,1,5,'2024-03-03',0),
 (5,2,3,'2024-03-01',1),(6,2,3,'2024-03-02',1),(7,2,4,'2024-03-02',0),(8,3,5,'2024-03-01',1),
 (9,3,6,'2024-03-01',1),(10,3,5,'2024-03-02',1),(11,3,6,'2024-03-04',1),(12,4,7,'2024-03-02',1),
 (13,4,8,'2024-03-03',1),(14,4,7,'2024-03-04',0),(15,5,1,'2024-03-05',1),(16,5,3,'2024-03-05',1),
 (17,6,7,'2024-03-01',1),(18,6,8,'2024-03-02',1),(19,6,7,'2024-03-03',1),(20,6,8,'2024-03-04',1),
 (21,6,7,'2024-03-05',1),(22,1,2,'2024-03-06',1),(23,1,1,'2024-03-07',1),(24,8,2,'2024-03-02',1),
 (25,8,2,'2024-03-03',1),(26,8,1,'2024-03-04',0),(27,2,3,'2024-03-06',1),(28,2,3,'2024-03-07',1),
 (29,3,5,'2024-03-08',1),(30,4,7,'2024-03-09',1),(31,6,8,'2024-03-09',1),(32,6,7,'2024-03-10',1);`,
  },
  {
    id: "library",
    label: "Library",
    blurb: "Books, members and loans (some still out).",
    seed: `CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT NOT NULL, joined TEXT NOT NULL);
CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT NOT NULL, genre TEXT NOT NULL, year INTEGER NOT NULL);
CREATE TABLE loans (id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL REFERENCES books(id), member_id INTEGER NOT NULL REFERENCES members(id), loaned_on TEXT NOT NULL, returned_on TEXT);
INSERT INTO members VALUES (1,'Ines','2022-01-10'),(2,'Jonas','2022-06-01'),(3,'Kira','2023-02-14'),(4,'Leo','2023-09-30'),(5,'Mira','2024-01-20');
INSERT INTO books VALUES (1,'Dune Notes','Frank H','scifi',1965),(2,'Sea Tales','Anna K','adventure',1998),(3,'Code Craft','Raj P','tech',2015),(4,'Old Maps','Anna K','history',1987),(5,'Deep Systems','Raj P','tech',2019),(6,'Mind Games','Lia M','psychology',2011),(7,'Star Atlas','Frank H','scifi',1971),(8,'Quiet Rooms','Lia M','psychology',2020);
INSERT INTO loans VALUES
 (1,1,1,'2024-01-05','2024-01-19'),(2,3,1,'2024-01-20','2024-02-03'),(3,3,2,'2024-02-05','2024-02-26'),(4,5,2,'2024-02-10',NULL),
 (5,2,3,'2024-02-12','2024-02-20'),(6,6,3,'2024-03-01','2024-03-10'),(7,1,4,'2024-03-02',NULL),(8,3,4,'2024-03-11','2024-03-15'),
 (9,7,1,'2024-03-05','2024-03-30'),(10,5,3,'2024-03-12',NULL),(11,4,2,'2024-03-14','2024-03-25'),(12,3,3,'2024-03-20',NULL);`,
  },
];

export const EXTRA_MONGO_DATASETS: readonly MongoDataset[] = [
  {
    id: "blog",
    label: "Blog",
    blurb: "authors and posts, with tags and comments embedded in each post.",
    collections: {
      authors: [
        { _id: 1, name: "Priya", country: "IN", joined: "2022-01-10" },
        { _id: 2, name: "Marco", country: "IT", joined: "2022-05-02" },
        { _id: 3, name: "Sam", country: "US", joined: "2023-03-15" },
        { _id: 4, name: "Zoe", country: "UK", joined: "2023-09-01" },
      ],
      posts: [
        { _id: 1, authorId: 1, title: "Intro to Indexes", tags: ["mongodb", "performance"], views: 820, published: true, createdAt: "2024-01-05", comments: [{ user: "marco", text: "Great intro", likes: 4 }, { user: "sam", text: "Thanks!", likes: 1 }] },
        { _id: 2, authorId: 1, title: "Schema Design Patterns", tags: ["mongodb", "design"], views: 1450, published: true, createdAt: "2024-01-19", comments: [{ user: "sam", text: "Bookmarked", likes: 7 }, { user: "zoe", text: "Which pattern for tags?", likes: 2 }, { user: "marco", text: "Nice", likes: 0 }] },
        { _id: 3, authorId: 2, title: "Caching 101", tags: ["redis", "performance"], views: 560, published: true, createdAt: "2024-02-02", comments: [{ user: "priya", text: "Clear", likes: 3 }] },
        { _id: 4, authorId: 2, title: "Draft: Queues", tags: ["design"], views: 0, published: false, createdAt: "2024-02-10", comments: [] },
        { _id: 5, authorId: 3, title: "Why Idempotency Matters", tags: ["api", "design"], views: 940, published: true, createdAt: "2024-02-14", comments: [{ user: "priya", text: "Saved me last week", likes: 9 }, { user: "zoe", text: "+1", likes: 1 }] },
        { _id: 6, authorId: 3, title: "Rate Limiting Basics", tags: ["api", "performance"], views: 310, published: true, createdAt: "2024-02-28", comments: [{ user: "marco", text: "Token bucket please", likes: 5 }] },
        { _id: 7, authorId: 1, title: "Aggregation Cookbook", tags: ["mongodb"], views: 2100, published: true, createdAt: "2024-03-03", comments: [{ user: "sam", text: "Gold", likes: 11 }, { user: "zoe", text: "More $lookup", likes: 3 }, { user: "marco", text: "Yes", likes: 2 }, { user: "priya", text: "Will do", likes: 6 }] },
        { _id: 8, authorId: 4, title: "Testing Async Code", tags: ["testing"], views: 275, published: true, createdAt: "2024-03-08", comments: [] },
        { _id: 9, authorId: 4, title: "Draft: Mocking", tags: ["testing", "design"], views: 12, published: false, createdAt: "2024-03-12", comments: [{ user: "sam", text: "Ping me", likes: 0 }] },
        { _id: 10, authorId: 2, title: "Redis Streams", tags: ["redis", "api"], views: 680, published: true, createdAt: "2024-03-15", comments: [{ user: "priya", text: "Neat", likes: 2 }] },
      ],
    },
  },
  {
    id: "events",
    label: "Product events",
    blurb: "users and an event log of views, clicks and purchases.",
    collections: {
      users: [
        { _id: 1, name: "Ana", country: "IN", plan: "pro" },
        { _id: 2, name: "Ben", country: "US", plan: "free" },
        { _id: 3, name: "Cleo", country: "US", plan: "pro" },
        { _id: 4, name: "Dev", country: "DE", plan: "free" },
        { _id: 5, name: "Eve", country: "IN", plan: "free" },
      ],
      events: [
        { _id: 1, userId: 1, type: "view", page: "/home", ts: "2024-03-01T09:00" },
        { _id: 2, userId: 1, type: "view", page: "/pricing", ts: "2024-03-01T09:02" },
        { _id: 3, userId: 1, type: "purchase", page: "/checkout", ts: "2024-03-01T09:10", amount: 120 },
        { _id: 4, userId: 2, type: "view", page: "/blog/intro", ts: "2024-03-01T10:00" },
        { _id: 5, userId: 2, type: "click", page: "/blog/intro", ts: "2024-03-01T10:01" },
        { _id: 6, userId: 2, type: "view", page: "/pricing", ts: "2024-03-02T08:30" },
        { _id: 7, userId: 3, type: "view", page: "/home", ts: "2024-03-02T09:00" },
        { _id: 8, userId: 3, type: "purchase", page: "/checkout", ts: "2024-03-02T09:05", amount: 40 },
        { _id: 9, userId: 3, type: "purchase", page: "/checkout", ts: "2024-03-03T11:00", amount: 75 },
        { _id: 10, userId: 4, type: "view", page: "/blog/tips", ts: "2024-03-03T12:00" },
        { _id: 11, userId: 4, type: "click", page: "/blog/tips", ts: "2024-03-03T12:03" },
        { _id: 12, userId: 4, type: "view", page: "/home", ts: "2024-03-04T07:45" },
        { _id: 13, userId: 1, type: "view", page: "/blog/tips", ts: "2024-03-04T08:00" },
        { _id: 14, userId: 3, type: "click", page: "/pricing", ts: "2024-03-04T09:00" },
        { _id: 15, userId: 1, type: "purchase", page: "/checkout", ts: "2024-03-05T10:00", amount: 60 },
        { _id: 16, userId: 2, type: "purchase", page: "/checkout", ts: "2024-03-05T10:30", amount: 15 },
      ],
    },
  },
];
