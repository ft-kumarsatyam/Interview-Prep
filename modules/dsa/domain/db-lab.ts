/**
 * DB Lab content: seeded datasets and interview-style challenges for SQL (sql.js in a worker) and
 * Mongo-style queries (lib/domain/mongo-query.ts). Pure data plus the result comparer. A challenge is
 * checked by running the learner's query and a reference query on the same data and comparing rows.
 */
import type { Collections } from "@/modules/dsa/domain/mongo-query";

export type DbMode = "sql" | "mongo";

export interface SqlDataset {
  id: string;
  label: string;
  blurb: string;
  /** CREATE TABLE + INSERT statements that build the whole database. */
  seed: string;
}

export const SQL_DATASETS: readonly SqlDataset[] = [
  {
    id: "company",
    label: "Company",
    blurb: "Employees, managers, departments and project hours.",
    seed: `CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT NOT NULL, budget INTEGER);
CREATE TABLE employees (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER REFERENCES departments(id), manager_id INTEGER REFERENCES employees(id), salary INTEGER NOT NULL, hire_date TEXT NOT NULL, title TEXT);
CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT NOT NULL, department_id INTEGER REFERENCES departments(id));
CREATE TABLE assignments (employee_id INTEGER REFERENCES employees(id), project_id INTEGER REFERENCES projects(id), hours INTEGER NOT NULL, PRIMARY KEY (employee_id, project_id));
INSERT INTO departments VALUES (1,'Engineering',500000),(2,'Sales',300000),(3,'HR',150000),(4,'Marketing',200000);
INSERT INTO employees VALUES
 (1,'Alice',1,NULL,150000,'2018-03-01','CTO'),
 (2,'Bob',1,1,120000,'2019-06-15','Staff Engineer'),
 (3,'Carol',1,2,95000,'2021-01-10','Engineer'),
 (4,'Dan',1,2,98000,'2022-07-01','Engineer'),
 (5,'Eve',2,1,110000,'2018-11-20','VP Sales'),
 (6,'Frank',2,5,70000,'2020-02-14','Account Exec'),
 (7,'Grace',2,5,72000,'2021-09-09','Account Exec'),
 (8,'Heidi',3,1,90000,'2019-04-04','HR Lead'),
 (9,'Ivan',4,1,85000,'2020-08-08','Marketing Lead'),
 (10,'Judy',4,9,60000,'2023-01-16','Designer'),
 (11,'Mallory',NULL,1,55000,'2023-05-05','Intern'),
 (12,'Ken',1,2,95000,'2023-10-02','Engineer');
INSERT INTO projects VALUES (1,'Search',1),(2,'Billing',1),(3,'Campaign',4),(4,'Pipeline',2);
INSERT INTO assignments VALUES (2,1,20),(3,1,40),(3,2,10),(4,2,40),(12,1,30),(6,4,35),(7,4,30),(9,3,25),(10,3,40);`,
  },
  {
    id: "shop",
    label: "Online shop",
    blurb: "Customers, products, orders and line items.",
    seed: `CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL, signup_date TEXT NOT NULL);
CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL, price INTEGER NOT NULL);
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id), order_date TEXT NOT NULL, status TEXT NOT NULL);
CREATE TABLE order_items (order_id INTEGER NOT NULL REFERENCES orders(id), product_id INTEGER NOT NULL REFERENCES products(id), quantity INTEGER NOT NULL, PRIMARY KEY (order_id, product_id));
INSERT INTO customers VALUES (1,'Ana','IN','2023-01-05'),(2,'Ben','US','2023-02-11'),(3,'Chloe','US','2023-03-02'),(4,'Dmitri','DE','2023-03-20'),(5,'Esha','IN','2023-04-18'),(6,'Farid','AE','2023-06-01'),(7,'Gina','US','2023-07-07');
INSERT INTO products VALUES (1,'Keyboard','Accessories',50),(2,'Mouse','Accessories',25),(3,'Monitor','Displays',300),(4,'Laptop','Computers',1200),(5,'Webcam','Accessories',80),(6,'Desk','Furniture',400),(7,'Chair','Furniture',250),(8,'Dock','Accessories',150),(9,'Cable','Accessories',10);
INSERT INTO orders VALUES (1,1,'2024-01-03','delivered'),(2,1,'2024-02-10','delivered'),(3,2,'2024-01-15','delivered'),(4,2,'2024-03-01','cancelled'),(5,3,'2024-02-20','delivered'),(6,3,'2024-03-05','delivered'),(7,3,'2024-03-28','shipped'),(8,4,'2024-02-02','delivered'),(9,5,'2024-03-12','delivered'),(10,5,'2024-03-30','shipped'),(11,6,'2024-01-25','cancelled'),(12,1,'2024-03-15','delivered');
INSERT INTO order_items VALUES (1,1,1),(1,2,2),(2,4,1),(3,3,2),(4,5,1),(5,1,1),(5,8,1),(6,6,1),(7,7,2),(8,3,1),(8,2,1),(9,4,1),(10,5,2),(11,7,1),(12,2,3),(12,1,1);`,
  },
];

export interface MongoDataset {
  id: string;
  label: string;
  blurb: string;
  collections: Collections;
}

export const MONGO_DATASETS: readonly MongoDataset[] = [
  {
    id: "shop",
    label: "Online shop",
    blurb: "users, products and orders with embedded line items.",
    collections: {
      users: [
        { _id: 1, name: "Ana", country: "IN", age: 29, tags: ["vip", "newsletter"], address: { city: "Pune" } },
        { _id: 2, name: "Ben", country: "US", age: 35, tags: [], address: { city: "Austin" } },
        { _id: 3, name: "Chloe", country: "US", age: 41, tags: ["vip"], address: { city: "Denver" } },
        { _id: 4, name: "Dmitri", country: "DE", age: 23, tags: ["newsletter"], address: { city: "Berlin" } },
        { _id: 5, name: "Esha", country: "IN", age: 33, tags: ["newsletter"], address: { city: "Delhi" } },
        { _id: 6, name: "Farid", country: "AE", age: 38, tags: [], address: { city: "Dubai" } },
        { _id: 7, name: "Gina", country: "US", age: 27, tags: ["vip"], address: { city: "Seattle" } },
      ],
      products: [
        { _id: 1, name: "Keyboard", category: "Accessories", price: 50, stock: 120 },
        { _id: 2, name: "Mouse", category: "Accessories", price: 25, stock: 300 },
        { _id: 3, name: "Monitor", category: "Displays", price: 300, stock: 40 },
        { _id: 4, name: "Laptop", category: "Computers", price: 1200, stock: 15 },
        { _id: 5, name: "Webcam", category: "Accessories", price: 80, stock: 60 },
        { _id: 6, name: "Desk", category: "Furniture", price: 400, stock: 12 },
      ],
      orders: [
        { _id: 101, userId: 1, status: "delivered", createdAt: "2024-01-03", items: [{ productId: 1, qty: 1, price: 50 }, { productId: 2, qty: 2, price: 25 }] },
        { _id: 102, userId: 1, status: "delivered", createdAt: "2024-02-10", items: [{ productId: 4, qty: 1, price: 1200 }] },
        { _id: 103, userId: 2, status: "cancelled", createdAt: "2024-01-15", items: [{ productId: 3, qty: 2, price: 300 }] },
        { _id: 104, userId: 3, status: "delivered", createdAt: "2024-02-20", items: [{ productId: 6, qty: 1, price: 400 }, { productId: 1, qty: 1, price: 50 }] },
        { _id: 105, userId: 3, status: "shipped", createdAt: "2024-03-05", items: [{ productId: 2, qty: 4, price: 25 }] },
        { _id: 106, userId: 4, status: "delivered", createdAt: "2024-03-12", items: [{ productId: 3, qty: 1, price: 300 }, { productId: 5, qty: 1, price: 80 }] },
        { _id: 107, userId: 5, status: "delivered", createdAt: "2024-03-20", items: [{ productId: 4, qty: 1, price: 1200 }] },
        { _id: 108, userId: 6, status: "cancelled", createdAt: "2024-03-22", items: [{ productId: 5, qty: 3, price: 80 }] },
      ],
    },
  },
];

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface DbChallenge {
  id: string;
  mode: DbMode;
  dataset: string;
  title: string;
  difficulty: Difficulty;
  /** The question as an interviewer would ask it. */
  prompt: string;
  hint: string;
  /** Reference query. Never shown until the learner asks. */
  solution: string;
  /** True when row order matters (the question asks for an ordering). */
  ordered: boolean;
  concepts: string[];
}

export const DB_CHALLENGES: readonly DbChallenge[] = [
  {
    id: "sql-high-earners",
    mode: "sql",
    dataset: "company",
    title: "High earners",
    difficulty: "Easy",
    prompt: "List the name and salary of everyone who earns more than 100,000, highest salary first.",
    hint: "WHERE filters rows, ORDER BY ... DESC sorts.",
    solution: "SELECT name, salary FROM employees WHERE salary > 100000 ORDER BY salary DESC",
    ordered: true,
    concepts: ["WHERE", "ORDER BY"],
  },
  {
    id: "sql-no-department",
    mode: "sql",
    dataset: "company",
    title: "Employees without a department",
    difficulty: "Easy",
    prompt: "Which employees have no department?",
    hint: "NULL never equals anything, not even NULL. Use IS NULL.",
    solution: "SELECT name FROM employees WHERE department_id IS NULL",
    ordered: false,
    concepts: ["NULL", "IS NULL"],
  },
  {
    id: "sql-headcount",
    mode: "sql",
    dataset: "company",
    title: "Headcount per department",
    difficulty: "Easy",
    prompt: "Show each department's name and its number of employees, in department-name order. Include departments with nobody in them.",
    hint: "LEFT JOIN from departments, then COUNT a column of the employee side so empty departments count 0.",
    solution:
      "SELECT d.name, COUNT(e.id) AS headcount FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id, d.name ORDER BY d.name",
    ordered: true,
    concepts: ["LEFT JOIN", "GROUP BY", "COUNT"],
  },
  {
    id: "sql-managers",
    mode: "sql",
    dataset: "company",
    title: "Employee and manager",
    difficulty: "Medium",
    prompt: "List every employee with their manager's name (NULL for the top boss), ordered by employee id.",
    hint: "Join the employees table to itself; use a LEFT JOIN so the CTO is kept.",
    solution: "SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON m.id = e.manager_id ORDER BY e.id",
    ordered: true,
    concepts: ["self join", "LEFT JOIN"],
  },
  {
    id: "sql-second-highest",
    mode: "sql",
    dataset: "company",
    title: "Second-highest salary",
    difficulty: "Medium",
    prompt: "What is the second-highest distinct salary?",
    hint: "The max of everything below the max. Or DENSE_RANK() = 2.",
    solution: "SELECT MAX(salary) AS second_highest FROM employees WHERE salary < (SELECT MAX(salary) FROM employees)",
    ordered: false,
    concepts: ["subquery", "MAX"],
  },
  {
    id: "sql-above-average",
    mode: "sql",
    dataset: "company",
    title: "Above their department's average",
    difficulty: "Medium",
    prompt: "Which employees earn more than the average salary of their own department? Order by name.",
    hint: "Compute the per-department average in a derived table, then join it back.",
    solution:
      "SELECT e.name FROM employees e JOIN (SELECT department_id, AVG(salary) AS avg_salary FROM employees GROUP BY department_id) x ON x.department_id = e.department_id WHERE e.salary > x.avg_salary ORDER BY e.name",
    ordered: true,
    concepts: ["derived table", "AVG", "GROUP BY"],
  },
  {
    id: "sql-top-per-dept",
    mode: "sql",
    dataset: "company",
    title: "Top earner per department",
    difficulty: "Hard",
    prompt: "For each department, show the department name and its highest-paid employee (name, salary). Ignore people without a department. Order by department name.",
    hint: "RANK() OVER (PARTITION BY department_id ORDER BY salary DESC), then keep rank 1.",
    solution:
      "SELECT d.name AS department, e.name, e.salary FROM (SELECT *, RANK() OVER (PARTITION BY department_id ORDER BY salary DESC) AS rnk FROM employees WHERE department_id IS NOT NULL) e JOIN departments d ON d.id = e.department_id WHERE e.rnk = 1 ORDER BY d.name",
    ordered: true,
    concepts: ["window function", "RANK", "PARTITION BY"],
  },
  {
    id: "sql-project-hours",
    mode: "sql",
    dataset: "company",
    title: "Busy projects",
    difficulty: "Medium",
    prompt: "Which projects have at least 60 total assigned hours? Show name and total hours, most hours first, ties by name.",
    hint: "Filter groups with HAVING, not WHERE.",
    solution:
      "SELECT p.name, SUM(a.hours) AS hours FROM projects p JOIN assignments a ON a.project_id = p.id GROUP BY p.id, p.name HAVING SUM(a.hours) >= 60 ORDER BY hours DESC, p.name",
    ordered: true,
    concepts: ["HAVING", "SUM", "JOIN"],
  },
  {
    id: "sql-running-total",
    mode: "sql",
    dataset: "company",
    title: "Running payroll",
    difficulty: "Hard",
    prompt: "In hire-date order (ties by id), show name, hire_date, salary and the running total of salary so far.",
    hint: "SUM(salary) OVER (ORDER BY hire_date, id).",
    solution:
      "SELECT name, hire_date, salary, SUM(salary) OVER (ORDER BY hire_date, id) AS running_total FROM employees ORDER BY hire_date, id",
    ordered: true,
    concepts: ["window function", "running total"],
  },
  {
    id: "sql-all-reports",
    mode: "sql",
    dataset: "company",
    title: "Everyone under Bob",
    difficulty: "Hard",
    prompt: "List everyone who reports to Bob (id 2), directly or indirectly, ordered by name.",
    hint: "A recursive CTE: start with Bob's direct reports, then repeatedly add their reports.",
    solution:
      "WITH RECURSIVE r(id, name) AS (SELECT id, name FROM employees WHERE manager_id = 2 UNION ALL SELECT e.id, e.name FROM employees e JOIN r ON e.manager_id = r.id) SELECT name FROM r ORDER BY name",
    ordered: true,
    concepts: ["recursive CTE", "hierarchies"],
  },
  {
    id: "sql-no-orders",
    mode: "sql",
    dataset: "shop",
    title: "Customers who never ordered",
    difficulty: "Easy",
    prompt: "Which customers have not placed any order?",
    hint: "LEFT JOIN orders and keep rows where the order side is NULL, or use NOT EXISTS.",
    solution: "SELECT c.name FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL ORDER BY c.name",
    ordered: false,
    concepts: ["anti-join", "LEFT JOIN"],
  },
  {
    id: "sql-unsold-products",
    mode: "sql",
    dataset: "shop",
    title: "Products nobody bought",
    difficulty: "Easy",
    prompt: "Which products have never appeared in an order?",
    hint: "NOT EXISTS (SELECT 1 FROM order_items ...) reads naturally and handles NULLs safely.",
    solution: "SELECT name FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id)",
    ordered: false,
    concepts: ["NOT EXISTS", "anti-join"],
  },
  {
    id: "sql-category-revenue",
    mode: "sql",
    dataset: "shop",
    title: "Revenue by category",
    difficulty: "Medium",
    prompt: "Revenue (price x quantity) per product category, ignoring cancelled orders, largest first.",
    hint: "Join order_items to orders (for status) and products (for price).",
    solution:
      "SELECT p.category, SUM(oi.quantity * p.price) AS revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id WHERE o.status <> 'cancelled' GROUP BY p.category ORDER BY revenue DESC",
    ordered: true,
    concepts: ["multi-table JOIN", "SUM", "GROUP BY"],
  },
  {
    id: "sql-monthly-orders",
    mode: "sql",
    dataset: "shop",
    title: "Delivered orders per month",
    difficulty: "Medium",
    prompt: "Count delivered orders per month (as YYYY-MM), in month order.",
    hint: "SQLite: strftime('%Y-%m', order_date). Group by the expression.",
    solution:
      "SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders FROM orders WHERE status = 'delivered' GROUP BY month ORDER BY month",
    ordered: true,
    concepts: ["date functions", "GROUP BY"],
  },
  {
    id: "sql-repeat-customers",
    mode: "sql",
    dataset: "shop",
    title: "Repeat customers",
    difficulty: "Medium",
    prompt: "Which customers placed more than one non-cancelled order? Show name and order count, most orders first, ties by name.",
    hint: "WHERE removes cancelled rows before grouping; HAVING keeps groups with count > 1.",
    solution:
      "SELECT c.name, COUNT(*) AS orders FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status <> 'cancelled' GROUP BY c.id, c.name HAVING COUNT(*) > 1 ORDER BY orders DESC, c.name",
    ordered: true,
    concepts: ["HAVING", "WHERE vs HAVING"],
  },

  {
    id: "mongo-in-users",
    mode: "mongo",
    dataset: "shop",
    title: "Users in India",
    difficulty: "Easy",
    prompt: "Find users whose country is IN. Show only name and age (no _id), ordered by name.",
    hint: "find(filter, projection).sort({ name: 1 }). Use _id: 0 to drop the id.",
    solution: "db.users.find({ country: 'IN' }, { name: 1, age: 1, _id: 0 }).sort({ name: 1 })",
    ordered: true,
    concepts: ["find", "projection", "sort"],
  },
  {
    id: "mongo-vip-tag",
    mode: "mongo",
    dataset: "shop",
    title: "VIP users",
    difficulty: "Easy",
    prompt: "Which users have the tag 'vip'? Return just their names.",
    hint: "Matching a value against an array field matches if any element equals it.",
    solution: "db.users.find({ tags: 'vip' }, { name: 1, _id: 0 })",
    ordered: false,
    concepts: ["array fields"],
  },
  {
    id: "mongo-price-range",
    mode: "mongo",
    dataset: "shop",
    title: "Mid-priced products",
    difficulty: "Easy",
    prompt: "Products priced from 50 to 300 inclusive: name and price, cheapest first.",
    hint: "{ price: { $gte: 50, $lte: 300 } }",
    solution: "db.products.find({ price: { $gte: 50, $lte: 300 } }, { name: 1, price: 1, _id: 0 }).sort({ price: 1 })",
    ordered: true,
    concepts: ["$gte", "$lte"],
  },
  {
    id: "mongo-orders-per-status",
    mode: "mongo",
    dataset: "shop",
    title: "Orders per status",
    difficulty: "Medium",
    prompt: "Count orders for each status. Sort by count descending, then status ascending.",
    hint: "$group by '$status' with { $sum: 1 }, then $sort.",
    solution: "db.orders.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }])",
    ordered: true,
    concepts: ["$group", "$sum", "$sort"],
  },
  {
    id: "mongo-revenue-per-user",
    mode: "mongo",
    dataset: "shop",
    title: "Revenue per user",
    difficulty: "Medium",
    prompt: "For non-cancelled orders, total revenue per userId (qty x price over all items), highest first.",
    hint: "$match status, $unwind '$items', $group with $sum of $multiply, then $sort.",
    solution:
      "db.orders.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $unwind: '$items' }, { $group: { _id: '$userId', revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } }, { $sort: { revenue: -1 } }])",
    ordered: true,
    concepts: ["$unwind", "$group", "$multiply"],
  },
  {
    id: "mongo-top-products",
    mode: "mongo",
    dataset: "shop",
    title: "Top 3 products by units",
    difficulty: "Medium",
    prompt: "Across all orders, which 3 productIds sold the most units (sum of qty)?",
    hint: "$unwind items, $group by '$items.productId', $sort, $limit.",
    solution:
      "db.orders.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.productId', units: { $sum: '$items.qty' } } }, { $sort: { units: -1, _id: 1 } }, { $limit: 3 }])",
    ordered: true,
    concepts: ["$unwind", "$group", "$limit"],
  },
  {
    id: "mongo-order-with-user",
    mode: "mongo",
    dataset: "shop",
    title: "Orders with the buyer's name",
    difficulty: "Hard",
    prompt: "List each order id with the name of the user who placed it, ordered by order id.",
    hint: "$lookup from users on userId = _id, then $unwind the joined array and $project.",
    solution:
      "db.orders.aggregate([{ $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } }, { $unwind: '$user' }, { $project: { buyer: '$user.name' } }, { $sort: { _id: 1 } }])",
    ordered: true,
    concepts: ["$lookup", "$unwind", "$project"],
  },
  {
    id: "mongo-no-orders",
    mode: "mongo",
    dataset: "shop",
    title: "Users who never ordered",
    difficulty: "Hard",
    prompt: "Which users have no orders? Return their names.",
    hint: "$lookup orders into an array, then $match where that array has size 0.",
    solution:
      "db.users.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } }, { $match: { orders: { $size: 0 } } }, { $project: { name: 1, _id: 0 } }])",
    ordered: false,
    concepts: ["$lookup", "$size", "anti-join"],
  },
];

export const challengesFor = (mode: DbMode, dataset: string) => DB_CHALLENGES.filter((c) => c.mode === mode && c.dataset === dataset);
export const sqlDataset = (id: string) => SQL_DATASETS.find((d) => d.id === id) ?? SQL_DATASETS[0]!;
export const mongoDataset = (id: string) => MONGO_DATASETS.find((d) => d.id === id) ?? MONGO_DATASETS[0]!;

export const STARTERS: Record<DbMode, string> = {
  sql: "-- Cmd/Ctrl + Enter to run. Everything runs in your browser (SQLite).\nSELECT * FROM employees LIMIT 5;",
  mongo: "// Cmd/Ctrl + Enter to run. A practice subset of the Mongo shell.\ndb.users.find({ country: 'US' }, { name: 1, age: 1 }).sort({ age: -1 })",
};

/* ------------------------------ comparing results ------------------------------ */

export type Cell = string | number | boolean | null;
export type Row = Cell[];

function normaliseCell(v: unknown): Cell {
  if (v === undefined || v === null) return null;
  if (typeof v === "number") return Number.isInteger(v) ? v : Math.round(v * 1e6) / 1e6;
  if (typeof v === "string" || typeof v === "boolean") return v;
  return JSON.stringify(v);
}

/** Mongo documents become rows by listing their values in alphabetical key order, so field order in a projection doesn't matter. */
export function docsToRows(docs: unknown[]): Row[] {
  return docs.map((d) => (d !== null && typeof d === "object" && !Array.isArray(d) ? Object.entries(d as Record<string, unknown>).toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([, v]) => normaliseCell(v)) : [normaliseCell(d)]));
}

export type Verdict = { ok: true } | { ok: false; reason: string };

/** Column names are ignored (aliases are free); values must match, in order when `ordered`. */
export function compareRows(actual: Row[], expected: Row[], ordered: boolean): Verdict {
  const norm = (rows: Row[]) => rows.map((r) => r.map(normaliseCell));
  const a = norm(actual);
  const e = norm(expected);
  if (a.length !== e.length) return { ok: false, reason: `Expected ${e.length} row${e.length === 1 ? "" : "s"}, got ${a.length}.` };
  const width = e[0]?.length ?? 0;
  if (a[0] && a[0].length !== width) return { ok: false, reason: `Expected ${width} column${width === 1 ? "" : "s"}, got ${a[0].length}.` };
  const key = (r: Row) => JSON.stringify(r);
  const x = ordered ? a.map(key) : a.map(key).toSorted();
  const y = ordered ? e.map(key) : e.map(key).toSorted();
  for (let i = 0; i < y.length; i++) {
    if (x[i] !== y[i]) {
      return { ok: false, reason: ordered && a.map(key).toSorted().join() === e.map(key).toSorted().join() ? "Right rows, wrong order." : "Some values differ from the expected result." };
    }
  }
  return { ok: true };
}

/** A hint when the values may match but the column names don't; LeetCode does check names. */
export function columnNameNote(actual: string[], expected: string[]): string | undefined {
  if (actual.length !== expected.length) return undefined;
  const differ = actual.some((c, i) => c.toLowerCase() !== expected[i]!.toLowerCase());
  return differ ? `Column names differ: expected ${expected.join(", ")}; you have ${actual.join(", ")}.` : undefined;
}

/** True when the editor holds nothing but comments and whitespace. */
export function isBlankQuery(source: string, mode: DbMode = "sql"): boolean {
  const stripped = mode === "sql" ? source.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "") : source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  return stripped.trim() === "";
}
