/**
 * Runnable versions of the SQL-track sheet problems: LeetCode's tables with sample rows (extended where
 * the example hides an edge case), and a reference query. Submit runs the learner's query and the
 * reference on the same fresh database and compares rows, exactly like a DB Lab challenge.
 */

export interface SqlProblem {
  slug: string;
  /** CREATE TABLE + INSERT statements, LeetCode's table and column names. */
  seed: string;
  /** Reference answer in SQLite (plus the MySQL helpers in lib/sandbox/sql-compat.ts). */
  solution: string;
  /** True when the problem asks for a row order. */
  ordered: boolean;
  /** For problems that change data (DELETE/UPDATE): run after the learner's statement, and its rows are compared instead. */
  verify?: string;
  /** Dialect differences specific to this problem, shown above the editor. */
  note?: string;
}

export const SQL_PROBLEMS: readonly SqlProblem[] = [
  {
    slug: "combine-two-tables",
    seed: `CREATE TABLE Person (personId INTEGER PRIMARY KEY, lastName TEXT, firstName TEXT);
CREATE TABLE Address (addressId INTEGER PRIMARY KEY, personId INTEGER, city TEXT, state TEXT);
INSERT INTO Person VALUES (1,'Wang','Allen'),(2,'Alice','Bob'),(3,'Lee','Chen');
INSERT INTO Address VALUES (1,2,'New York City','New York'),(2,3,'Leetcode','California'),(3,4,'Seattle','Washington');`,
    solution: "SELECT p.firstName, p.lastName, a.city, a.state FROM Person p LEFT JOIN Address a ON a.personId = p.personId",
    ordered: false,
  },
  {
    slug: "employees-earning-more-than-their-managers",
    seed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, managerId INTEGER);
INSERT INTO Employee VALUES (1,'Joe',70000,3),(2,'Henry',80000,4),(3,'Sam',60000,NULL),(4,'Max',90000,NULL),(5,'Ann',95000,4);`,
    solution: "SELECT e.name AS Employee FROM Employee e JOIN Employee m ON m.id = e.managerId WHERE e.salary > m.salary",
    ordered: false,
  },
  {
    slug: "duplicate-emails",
    seed: `CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT);
INSERT INTO Person VALUES (1,'a@b.com'),(2,'c@d.com'),(3,'a@b.com'),(4,'e@f.com'),(5,'c@d.com'),(6,'a@b.com');`,
    solution: "SELECT email AS Email FROM Person GROUP BY email HAVING COUNT(*) > 1",
    ordered: false,
  },
  {
    slug: "customers-who-never-order",
    seed: `CREATE TABLE Customers (id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE Orders (id INTEGER PRIMARY KEY, customerId INTEGER);
INSERT INTO Customers VALUES (1,'Joe'),(2,'Henry'),(3,'Sam'),(4,'Max');
INSERT INTO Orders VALUES (1,3),(2,1),(3,3);`,
    solution: "SELECT name AS Customers FROM Customers c WHERE NOT EXISTS (SELECT 1 FROM Orders o WHERE o.customerId = c.id)",
    ordered: false,
  },
  {
    slug: "delete-duplicate-emails",
    seed: `CREATE TABLE Person (id INTEGER PRIMARY KEY, email TEXT);
INSERT INTO Person VALUES (1,'john@example.com'),(2,'bob@example.com'),(3,'john@example.com'),(4,'amy@example.com'),(5,'bob@example.com');`,
    solution: "DELETE FROM Person WHERE id NOT IN (SELECT MIN(id) FROM Person GROUP BY email)",
    verify: "SELECT id, email FROM Person ORDER BY id",
    ordered: true,
    note: "Write a DELETE. After it runs, the Person table is compared. SQLite has no multi-table DELETE (DELETE p1 FROM p1 JOIN p2), so filter in the WHERE clause.",
  },
  {
    slug: "rising-temperature",
    seed: `CREATE TABLE Weather (id INTEGER PRIMARY KEY, recordDate TEXT, temperature INTEGER);
INSERT INTO Weather VALUES (1,'2015-01-01',10),(2,'2015-01-02',25),(3,'2015-01-03',20),(4,'2015-01-04',30),(5,'2015-01-07',40),(6,'2015-01-06',45);`,
    solution: "SELECT w.id AS Id FROM Weather w JOIN Weather y ON DATEDIFF(w.recordDate, y.recordDate) = 1 WHERE w.temperature > y.temperature",
    ordered: false,
  },
  {
    slug: "game-play-analysis-i",
    seed: `CREATE TABLE Activity (player_id INTEGER, device_id INTEGER, event_date TEXT, games_played INTEGER, PRIMARY KEY (player_id, event_date));
INSERT INTO Activity VALUES (1,2,'2016-03-01',5),(1,2,'2016-05-02',6),(2,3,'2017-06-25',1),(3,1,'2016-03-02',0),(3,4,'2018-07-03',5);`,
    solution: "SELECT player_id, MIN(event_date) AS first_login FROM Activity GROUP BY player_id",
    ordered: false,
  },
  {
    slug: "big-countries",
    seed: `CREATE TABLE World (name TEXT PRIMARY KEY, continent TEXT, area INTEGER, population INTEGER, gdp INTEGER);
INSERT INTO World VALUES ('Afghanistan','Asia',652230,25500100,20343000000),('Albania','Europe',28748,2831741,12960000000),('Algeria','Africa',2381741,37100000,188681000000),('Andorra','Europe',468,78115,3712000000),('Angola','Africa',1246700,20609294,100990000000),('Canada','North America',9984670,24000000,1700000000000);`,
    solution: "SELECT name, population, area FROM World WHERE area >= 3000000 OR population >= 25000000",
    ordered: false,
  },
  {
    slug: "recyclable-and-low-fat-products",
    seed: `CREATE TABLE Products (product_id INTEGER PRIMARY KEY, low_fats TEXT, recyclable TEXT);
INSERT INTO Products VALUES (0,'Y','N'),(1,'Y','Y'),(2,'N','Y'),(3,'Y','Y'),(4,'N','N');`,
    solution: "SELECT product_id FROM Products WHERE low_fats = 'Y' AND recyclable = 'Y'",
    ordered: false,
  },
  {
    slug: "second-highest-salary",
    seed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, salary INTEGER);
INSERT INTO Employee VALUES (1,100),(2,200),(3,300),(4,300);`,
    solution: "SELECT (SELECT DISTINCT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET 1) AS SecondHighestSalary",
    ordered: false,
  },
  {
    slug: "nth-highest-salary",
    seed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, salary INTEGER);
CREATE TABLE Params (N INTEGER);
INSERT INTO Employee VALUES (1,100),(2,200),(3,300),(4,200);
INSERT INTO Params VALUES (2);`,
    solution: `SELECT (SELECT DISTINCT salary FROM Employee ORDER BY salary DESC LIMIT 1 OFFSET (SELECT N - 1 FROM Params)) AS "getNthHighestSalary(2)"`,
    ordered: false,
    note: "SQLite has no CREATE FUNCTION. N is in the one-row table Params(N), set to 2 here, so write the query the function would return.",
  },
  {
    slug: "rank-scores",
    seed: `CREATE TABLE Scores (id INTEGER PRIMARY KEY, score REAL);
INSERT INTO Scores VALUES (1,3.50),(2,3.65),(3,4.00),(4,3.85),(5,4.00),(6,3.65);`,
    solution: `SELECT score, DENSE_RANK() OVER (ORDER BY score DESC) AS "rank" FROM Scores ORDER BY score DESC`,
    ordered: true,
  },
  {
    slug: "consecutive-numbers",
    seed: `CREATE TABLE Logs (id INTEGER PRIMARY KEY, num INTEGER);
INSERT INTO Logs VALUES (1,1),(2,1),(3,1),(4,2),(5,1),(6,2),(7,2),(8,3),(9,3),(10,3),(11,3);`,
    solution:
      "SELECT DISTINCT l1.num AS ConsecutiveNums FROM Logs l1 JOIN Logs l2 ON l2.id = l1.id + 1 AND l2.num = l1.num JOIN Logs l3 ON l3.id = l1.id + 2 AND l3.num = l1.num",
    ordered: false,
  },
  {
    slug: "department-highest-salary",
    seed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, departmentId INTEGER);
CREATE TABLE Department (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO Employee VALUES (1,'Joe',70000,1),(2,'Jim',90000,1),(3,'Henry',80000,2),(4,'Sam',60000,2),(5,'Max',90000,1);
INSERT INTO Department VALUES (1,'IT'),(2,'Sales');`,
    solution:
      "SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary FROM Employee e JOIN Department d ON d.id = e.departmentId WHERE e.salary = (SELECT MAX(x.salary) FROM Employee x WHERE x.departmentId = e.departmentId)",
    ordered: false,
  },
  {
    slug: "game-play-analysis-iv",
    seed: `CREATE TABLE Activity (player_id INTEGER, device_id INTEGER, event_date TEXT, games_played INTEGER, PRIMARY KEY (player_id, event_date));
INSERT INTO Activity VALUES (1,2,'2016-03-01',5),(1,2,'2016-03-02',6),(2,3,'2017-06-25',1),(3,1,'2016-03-02',0),(3,4,'2018-07-03',5);`,
    solution:
      "SELECT ROUND(COUNT(a.player_id) * 1.0 / (SELECT COUNT(DISTINCT player_id) FROM Activity), 2) AS fraction FROM (SELECT player_id, MIN(event_date) AS first FROM Activity GROUP BY player_id) f LEFT JOIN Activity a ON a.player_id = f.player_id AND DATEDIFF(a.event_date, f.first) = 1",
    ordered: false,
  },
  {
    slug: "managers-with-at-least-5-direct-reports",
    seed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, department TEXT, managerId INTEGER);
INSERT INTO Employee VALUES (101,'John','A',NULL),(102,'Dan','A',101),(103,'James','A',101),(104,'Amy','A',101),(105,'Anne','A',101),(106,'Ron','B',101),
 (107,'Kim','B',102),(108,'Lea','C',200),(109,'Omar','C',200),(110,'Pia','C',200),(111,'Raj','C',200),(112,'Sue','C',200);`,
    solution: "SELECT e.name FROM Employee e JOIN (SELECT managerId FROM Employee GROUP BY managerId HAVING COUNT(*) >= 5) m ON m.managerId = e.id",
    ordered: false,
  },
  {
    slug: "confirmation-rate",
    seed: `CREATE TABLE Signups (user_id INTEGER PRIMARY KEY, time_stamp TEXT);
CREATE TABLE Confirmations (user_id INTEGER, time_stamp TEXT, action TEXT, PRIMARY KEY (user_id, time_stamp));
INSERT INTO Signups VALUES (3,'2020-03-21 10:16:13'),(7,'2020-01-04 13:57:59'),(2,'2020-07-29 23:09:44'),(6,'2020-12-09 10:39:37');
INSERT INTO Confirmations VALUES (3,'2021-01-06 03:30:46','timeout'),(3,'2021-07-14 14:00:00','timeout'),(7,'2021-06-12 11:57:29','confirmed'),(7,'2021-06-13 12:58:28','confirmed'),(7,'2021-06-14 13:59:27','confirmed'),(2,'2021-01-22 00:00:00','confirmed'),(2,'2021-02-28 23:59:59','timeout');`,
    solution:
      "SELECT s.user_id, ROUND(AVG(CASE WHEN c.action = 'confirmed' THEN 1.0 ELSE 0 END), 2) AS confirmation_rate FROM Signups s LEFT JOIN Confirmations c ON c.user_id = s.user_id GROUP BY s.user_id",
    ordered: false,
  },
  {
    slug: "monthly-transactions-i",
    seed: `CREATE TABLE Transactions (id INTEGER PRIMARY KEY, country TEXT, state TEXT, amount INTEGER, trans_date TEXT);
INSERT INTO Transactions VALUES (121,'US','approved',1000,'2018-12-18'),(122,'US','declined',2000,'2018-12-19'),(123,'US','approved',2000,'2019-01-01'),(124,'DE','approved',2000,'2019-01-07'),(125,'DE','declined',700,'2019-01-20');`,
    solution:
      "SELECT strftime('%Y-%m', trans_date) AS month, country, COUNT(*) AS trans_count, SUM(state = 'approved') AS approved_count, SUM(amount) AS trans_total_amount, SUM(CASE WHEN state = 'approved' THEN amount ELSE 0 END) AS approved_total_amount FROM Transactions GROUP BY month, country",
    ordered: false,
  },
  {
    slug: "immediate-food-delivery-ii",
    seed: `CREATE TABLE Delivery (delivery_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, customer_pref_delivery_date TEXT);
INSERT INTO Delivery VALUES (1,1,'2019-08-01','2019-08-02'),(2,2,'2019-08-02','2019-08-02'),(3,1,'2019-08-11','2019-08-12'),(4,3,'2019-08-24','2019-08-24'),(5,3,'2019-08-21','2019-08-22'),(6,2,'2019-08-11','2019-08-13'),(7,4,'2019-08-09','2019-08-09');`,
    solution:
      "SELECT ROUND(100.0 * SUM(order_date = customer_pref_delivery_date) / COUNT(*), 2) AS immediate_percentage FROM Delivery d WHERE order_date = (SELECT MIN(x.order_date) FROM Delivery x WHERE x.customer_id = d.customer_id)",
    ordered: false,
  },
  {
    slug: "restaurant-growth",
    seed: `CREATE TABLE Customer (customer_id INTEGER, name TEXT, visited_on TEXT, amount INTEGER, PRIMARY KEY (customer_id, visited_on));
INSERT INTO Customer VALUES (1,'Jhon','2019-01-01',100),(2,'Daniel','2019-01-02',110),(3,'Jade','2019-01-03',120),(4,'Khaled','2019-01-04',130),(5,'Winston','2019-01-05',110),(6,'Elvis','2019-01-06',140),(7,'Anna','2019-01-07',150),(8,'Maria','2019-01-08',80),(9,'Jaze','2019-01-09',110),(1,'Jhon','2019-01-10',130),(3,'Jade','2019-01-10',150);`,
    solution: `WITH d AS (SELECT visited_on, SUM(amount) AS amount FROM Customer GROUP BY visited_on)
SELECT a.visited_on, SUM(b.amount) AS amount, ROUND(SUM(b.amount) / 7.0, 2) AS average_amount
FROM d a JOIN d b ON DATEDIFF(a.visited_on, b.visited_on) BETWEEN 0 AND 6
WHERE a.visited_on >= (SELECT DATE(MIN(visited_on), '+6 days') FROM Customer)
GROUP BY a.visited_on ORDER BY a.visited_on`,
    ordered: true,
    note: "No DATE_ADD(d, INTERVAL 6 DAY) in SQLite: use DATE(d, '+6 days') or the DATEDIFF helper.",
  },
  {
    slug: "exchange-seats",
    seed: `CREATE TABLE Seat (id INTEGER PRIMARY KEY, student TEXT);
INSERT INTO Seat VALUES (1,'Abbot'),(2,'Doris'),(3,'Emerson'),(4,'Green'),(5,'Jeames');`,
    solution:
      "SELECT CASE WHEN id % 2 = 1 AND id = (SELECT MAX(id) FROM Seat) THEN id WHEN id % 2 = 1 THEN id + 1 ELSE id - 1 END AS id, student FROM Seat ORDER BY id",
    ordered: true,
  },
  {
    slug: "movie-rating",
    seed: `CREATE TABLE Movies (movie_id INTEGER PRIMARY KEY, title TEXT);
CREATE TABLE Users (user_id INTEGER PRIMARY KEY, name TEXT);
CREATE TABLE MovieRating (movie_id INTEGER, user_id INTEGER, rating INTEGER, created_at TEXT, PRIMARY KEY (movie_id, user_id));
INSERT INTO Movies VALUES (1,'Avengers'),(2,'Frozen 2'),(3,'Joker');
INSERT INTO Users VALUES (1,'Daniel'),(2,'Monica'),(3,'Maria'),(4,'James');
INSERT INTO MovieRating VALUES (1,1,3,'2020-01-12'),(1,2,4,'2020-02-11'),(1,3,2,'2020-02-12'),(1,4,1,'2020-01-01'),(2,1,5,'2020-02-17'),(2,2,2,'2020-02-01'),(2,3,2,'2020-03-01'),(3,1,3,'2020-02-22'),(3,2,4,'2020-02-25');`,
    solution: `SELECT results FROM (SELECT u.name AS results FROM MovieRating r JOIN Users u ON u.user_id = r.user_id GROUP BY r.user_id ORDER BY COUNT(*) DESC, u.name LIMIT 1)
UNION ALL
SELECT results FROM (SELECT m.title AS results FROM MovieRating r JOIN Movies m ON m.movie_id = r.movie_id WHERE r.created_at BETWEEN '2020-02-01' AND '2020-02-29' GROUP BY r.movie_id ORDER BY AVG(r.rating) DESC, m.title LIMIT 1)`,
    ordered: true,
    note: "SQLite can't put ORDER BY/LIMIT on a bare UNION branch in parentheses. Wrap each branch: SELECT * FROM (… LIMIT 1) UNION ALL SELECT * FROM (…).",
  },
  {
    slug: "last-person-to-fit-in-the-bus",
    seed: `CREATE TABLE Queue (person_id INTEGER PRIMARY KEY, person_name TEXT, weight INTEGER, turn INTEGER);
INSERT INTO Queue VALUES (5,'Alice',250,1),(4,'Bob',175,5),(3,'Alex',350,2),(6,'John Cena',400,3),(1,'Winston',500,6),(2,'Marie',200,4);`,
    solution: "SELECT person_name FROM (SELECT person_name, turn, SUM(weight) OVER (ORDER BY turn) AS total FROM Queue) WHERE total <= 1000 ORDER BY turn DESC LIMIT 1",
    ordered: false,
  },
  {
    slug: "count-salary-categories",
    seed: `CREATE TABLE Accounts (account_id INTEGER PRIMARY KEY, income INTEGER);
INSERT INTO Accounts VALUES (3,108939),(2,12747),(8,87709),(6,91796);`,
    solution: `SELECT 'Low Salary' AS category, SUM(income < 20000) AS accounts_count FROM Accounts
UNION ALL SELECT 'Average Salary', SUM(income BETWEEN 20000 AND 50000) FROM Accounts
UNION ALL SELECT 'High Salary', SUM(income > 50000) FROM Accounts`,
    ordered: false,
  },
  {
    slug: "product-price-at-a-given-date",
    seed: `CREATE TABLE Products (product_id INTEGER, new_price INTEGER, change_date TEXT, PRIMARY KEY (product_id, change_date));
INSERT INTO Products VALUES (1,20,'2019-08-14'),(2,50,'2019-08-14'),(1,30,'2019-08-15'),(1,35,'2019-08-16'),(2,65,'2019-08-17'),(3,20,'2019-08-18');`,
    solution:
      "SELECT p.product_id, COALESCE((SELECT x.new_price FROM Products x WHERE x.product_id = p.product_id AND x.change_date <= '2019-08-16' ORDER BY x.change_date DESC LIMIT 1), 10) AS price FROM (SELECT DISTINCT product_id FROM Products) p",
    ordered: false,
  },
  {
    slug: "investments-in-2016",
    seed: `CREATE TABLE Insurance (pid INTEGER PRIMARY KEY, tiv_2015 REAL, tiv_2016 REAL, lat REAL, lon REAL);
INSERT INTO Insurance VALUES (1,10,5,10,10),(2,20,20,20,20),(3,10,30,20,20),(4,10,40,40,40);`,
    solution:
      "SELECT ROUND(SUM(tiv_2016), 2) AS tiv_2016 FROM Insurance i WHERE (SELECT COUNT(*) FROM Insurance x WHERE x.tiv_2015 = i.tiv_2015) > 1 AND (SELECT COUNT(*) FROM Insurance x WHERE x.lat = i.lat AND x.lon = i.lon) = 1",
    ordered: false,
  },
  {
    slug: "friend-requests-ii-who-has-the-most-friends",
    seed: `CREATE TABLE RequestAccepted (requester_id INTEGER, accepter_id INTEGER, accept_date TEXT, PRIMARY KEY (requester_id, accepter_id));
INSERT INTO RequestAccepted VALUES (1,2,'2016-06-03'),(1,3,'2016-06-08'),(2,3,'2016-06-08'),(3,4,'2016-06-09');`,
    solution:
      "SELECT id, COUNT(*) AS num FROM (SELECT requester_id AS id FROM RequestAccepted UNION ALL SELECT accepter_id FROM RequestAccepted) GROUP BY id ORDER BY num DESC LIMIT 1",
    ordered: false,
  },
  {
    slug: "department-top-three-salaries",
    seed: `CREATE TABLE Employee (id INTEGER PRIMARY KEY, name TEXT, salary INTEGER, departmentId INTEGER);
CREATE TABLE Department (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO Employee VALUES (1,'Joe',85000,1),(2,'Henry',80000,2),(3,'Sam',60000,2),(4,'Max',90000,1),(5,'Janet',69000,1),(6,'Randy',85000,1),(7,'Will',70000,1);
INSERT INTO Department VALUES (1,'IT'),(2,'Sales');`,
    solution: `SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary
FROM (SELECT *, DENSE_RANK() OVER (PARTITION BY departmentId ORDER BY salary DESC) AS rnk FROM Employee) e
JOIN Department d ON d.id = e.departmentId WHERE e.rnk <= 3`,
    ordered: false,
  },
  {
    slug: "trips-and-users",
    seed: `CREATE TABLE Trips (id INTEGER PRIMARY KEY, client_id INTEGER, driver_id INTEGER, city_id INTEGER, status TEXT, request_at TEXT);
CREATE TABLE Users (users_id INTEGER PRIMARY KEY, banned TEXT, role TEXT);
INSERT INTO Trips VALUES (1,1,10,1,'completed','2013-10-01'),(2,2,11,1,'cancelled_by_driver','2013-10-01'),(3,3,12,6,'completed','2013-10-01'),(4,4,13,6,'cancelled_by_client','2013-10-01'),(5,1,10,1,'completed','2013-10-02'),(6,2,11,6,'completed','2013-10-02'),(7,3,12,6,'completed','2013-10-02'),(8,2,12,12,'completed','2013-10-03'),(9,3,10,12,'completed','2013-10-03'),(10,4,13,12,'cancelled_by_driver','2013-10-03'),(11,1,10,1,'cancelled_by_client','2013-10-04');
INSERT INTO Users VALUES (1,'No','client'),(2,'Yes','client'),(3,'No','client'),(4,'No','client'),(10,'No','driver'),(11,'No','driver'),(12,'No','driver'),(13,'No','driver');`,
    solution: `SELECT t.request_at AS Day, ROUND(AVG(t.status <> 'completed'), 2) AS "Cancellation Rate"
FROM Trips t JOIN Users c ON c.users_id = t.client_id AND c.banned = 'No' JOIN Users d ON d.users_id = t.driver_id AND d.banned = 'No'
WHERE t.request_at BETWEEN '2013-10-01' AND '2013-10-03' GROUP BY t.request_at`,
    ordered: false,
  },
  {
    slug: "human-traffic-of-stadium",
    seed: `CREATE TABLE Stadium (id INTEGER PRIMARY KEY, visit_date TEXT, people INTEGER);
INSERT INTO Stadium VALUES (1,'2017-01-01',10),(2,'2017-01-02',109),(3,'2017-01-03',150),(4,'2017-01-04',99),(5,'2017-01-05',145),(6,'2017-01-06',1455),(7,'2017-01-07',199),(8,'2017-01-09',188);`,
    solution: `WITH s AS (SELECT *, id - ROW_NUMBER() OVER (ORDER BY id) AS grp FROM Stadium WHERE people >= 100)
SELECT id, visit_date, people FROM s WHERE grp IN (SELECT grp FROM s GROUP BY grp HAVING COUNT(*) >= 3) ORDER BY visit_date`,
    ordered: true,
  },
];

export const sqlProblemBySlug: ReadonlyMap<string, SqlProblem> = new Map(SQL_PROBLEMS.map((p) => [p.slug, p]));

/** Applies to every problem: the gotchas of running MySQL-flavoured answers on SQLite. */
export const SQL_DIALECT_TIPS = [
  "Runs on SQLite. IF, DATEDIFF, DATE_FORMAT, YEAR, MONTH, DAY, LEAST, GREATEST and TRUNCATE work like MySQL.",
  "Integer / integer truncates in SQLite. Multiply by 1.0 (or use AVG) before dividing.",
  "Column names don't affect the verdict, but LeetCode checks them, so match the expected names.",
] as const;
