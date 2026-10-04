export type FunCategory = "software" | "general" | "history";

export interface Puzzle {
  id: string;
  category: FunCategory;
  question: string;
  answer: string;
  hint: string;
}

export interface Joke {
  id: string;
  text: string;
  breakMinutes: number;
}

/** Starter pack for the distraction-free break shelf. More packs can be appended without schema work. */
export const PUZZLES: readonly Puzzle[] = [
  // ==================== SOFTWARE ENGINEERING ====================
  {
    id: "sw-1",
    category: "software",
    question: "You have an array of 1,000,000 integers and need to find the first duplicate in one pass. What data structure gives expected O(n) time?",
    answer: "A Set. Traverse the array, check whether each value exists, and return the first value already seen.",
    hint: "Trade memory for constant-time lookups."
  },
  {
    id: "sw-2",
    category: "software",
    question: "A queue worker processes the same job repeatedly, even after successful execution. What is the most likely cause?",
    answer: "The job is not being acknowledged, removed, or marked complete after successful processing.",
    hint: "Think about the difference between reading and consuming a message."
  },
  {
    id: "sw-3",
    category: "software",
    question: "In a CP distributed database, what typically happens when a network partition prevents nodes from communicating?",
    answer: "The system may reject or delay some requests to preserve consistency rather than return potentially stale data.",
    hint: "Consistency comes at a cost during a partition."
  },
  {
    id: "sw-4",
    category: "software",
    question: "Why can adding a database index make a previously fast INSERT operation slower?",
    answer: "The database must update the index structure whenever indexed data changes, adding write overhead.",
    hint: "Indexes improve reads, but they are not free."
  },
  {
    id: "sw-5",
    category: "software",
    question: "10,000 requests arrive simultaneously after a popular cache key expires. All of them query the database. What is this problem called?",
    answer: "A cache stampede. Common mitigations include request coalescing, distributed locks, TTL jitter, and stale-while-revalidate.",
    hint: "Many requests miss the same key at once."
  },
  {
    id: "sw-6",
    category: "software",
    question: "What does this JavaScript print: console.log(typeof null)?",
    answer: "It prints \"object\". This is a long-standing JavaScript quirk.",
    hint: "One of JavaScript's oldest surprises."
  },
  {
    id: "sw-7",
    category: "software",
    question: "What is the output of console.log([] + []) in JavaScript?",
    answer: "An empty string, \"\". Both arrays convert to empty strings during primitive conversion.",
    hint: "Think about array-to-string conversion."
  },
  {
    id: "sw-8",
    category: "software",
    question: "What is the output of console.log(0.1 + 0.2 === 0.3) in JavaScript?",
    answer: "false. Binary floating-point representation makes the sum slightly different from 0.3.",
    hint: "Computers represent decimal fractions in binary."
  },
  {
    id: "sw-9",
    category: "software",
    question: "What data structures are commonly used to implement an LRU cache with O(1) get and put operations?",
    answer: "A hash map and a doubly linked list. The map provides fast lookup, while the list maintains recency order.",
    hint: "You need both fast lookup and fast reordering."
  },
  {
    id: "sw-10",
    category: "software",
    question: "A payment API receives the same request three times because the client retries after timeouts. How do you prevent three charges?",
    answer: "Use an idempotency key and persist the outcome associated with that key, so retries return the original result instead of repeating the operation.",
    hint: "Network retries should not create duplicate side effects."
  },
  {
    id: "sw-11",
    category: "software",
    question: "Why is OFFSET pagination often slow for a table containing millions of rows when requesting page 10,000?",
    answer: "The database may still need to scan or discard a large number of preceding rows. Keyset pagination can avoid much of that work.",
    hint: "The database still has to get past the earlier rows."
  },
  {
    id: "sw-12",
    category: "software",
    question: "Two users update the same bank balance simultaneously. Each reads 1,000 and withdraws 100. What bug can leave the balance at 900 instead of 800?",
    answer: "A lost update caused by concurrent read-modify-write operations. Use transactions, row locks, or atomic conditional updates.",
    hint: "Both operations started with the same old value."
  },
  {
    id: "sw-13",
    category: "software",
    question: "A Node.js server has eight CPU-heavy tasks. Why might adding eight async functions not make them run in parallel?",
    answer: "Async/await does not automatically parallelize CPU-bound JavaScript. CPU-heavy work can block the event loop unless moved to worker threads, separate processes, or another execution service.",
    hint: "Asynchronous I/O and parallel CPU execution are different things."
  },
  {
    id: "sw-14",
    category: "software",
    question: "Why can Promise.all fail even when some of the promises succeed?",
    answer: "Promise.all rejects as soon as one input promise rejects, although other operations may continue running. Use Promise.allSettled when individual outcomes are needed.",
    hint: "One rejection can reject the aggregate promise."
  },
  {
    id: "sw-15",
    category: "software",
    question: "What is the difference between authentication and authorization?",
    answer: "Authentication verifies who a user is. Authorization determines what that user is allowed to access or do.",
    hint: "Identity versus permissions."
  },
  {
    id: "sw-16",
    category: "software",
    question: "An API responds successfully, but the same request creates duplicate orders when retried. What property is missing from the operation?",
    answer: "Idempotency. The API should recognize repeated requests and prevent duplicate side effects.",
    hint: "Repeating the same operation should not repeat its effect."
  },
  {
    id: "sw-17",
    category: "software",
    question: "Why can a database transaction still encounter a deadlock even when every query is individually correct?",
    answer: "Concurrent transactions may acquire locks in different orders and each wait for a resource held by the other. Consistent lock ordering and retry handling help.",
    hint: "Transaction A waits for B, while B waits for A."
  },
  {
    id: "sw-18",
    category: "software",
    question: "You need to rate-limit 100,000 users independently across five API servers. Why is an in-memory counter on each server insufficient?",
    answer: "Each server maintains a separate counter, so users can exceed the intended global limit by distributing requests across servers. Use a shared store or a coordinated rate-limiting mechanism.",
    hint: "The counter is local, but the limit is global."
  },
  {
    id: "sw-19",
    category: "software",
    question: "Why is storing a JWT in a URL query parameter risky?",
    answer: "URLs can appear in browser history, server logs, analytics, and referrer headers. Prefer secure transport and carefully managed cookies or authorization headers.",
    hint: "URLs are often recorded in places you do not expect."
  },
  {
    id: "sw-20",
    category: "software",
    question: "A service is receiving more requests than its database can handle. Why can simply increasing the number of API servers make the outage worse?",
    answer: "More API instances can generate even more concurrent database requests, exhausting connections and increasing contention. Apply backpressure, connection limits, caching, and capacity-aware scaling.",
    hint: "More producers do not necessarily create more capacity."
  },
  {
    id: "sw-21",
    category: "software",
    question: "What is the difference between horizontal scaling and vertical scaling?",
    answer: "Horizontal scaling adds more machines or instances. Vertical scaling increases the resources of an existing machine.",
    hint: "More machines versus a bigger machine."
  },
  {
    id: "sw-22",
    category: "software",
    question: "Why should passwords not be stored using plain SHA-256, even if the hash is irreversible?",
    answer: "Fast hashes allow attackers to test huge numbers of password guesses quickly. Use a password hashing algorithm such as Argon2id, bcrypt, or scrypt with appropriate parameters and salts.",
    hint: "The problem is how quickly guesses can be tested."
  },
  {
    id: "sw-23",
    category: "software",
    question: "A microservice calls another service synchronously, and the dependency becomes slow. Soon every service is overloaded. What design patterns can reduce cascading failures?",
    answer: "Timeouts, bounded retries with backoff, circuit breakers, concurrency limits, and bulkheads.",
    hint: "Stop one unhealthy dependency from taking down everything."
  },
  {
    id: "sw-24",
    category: "software",
    question: "What is the difference between a database replica and a database shard?",
    answer: "A replica stores a copy of the same data for redundancy or read scaling. A shard stores a partition of the overall dataset.",
    hint: "Copies versus partitions."
  },
  {
    id: "sw-25",
    category: "software",
    question: "A cache entry has a TTL of one hour, but the underlying record changes after five minutes. What problem can occur?",
    answer: "Stale data may be served for the remaining TTL. Use appropriate invalidation, shorter TTLs, versioning, or an event-driven cache update strategy.",
    hint: "The cached value outlives the truth."
  },
  {
    id: "sw-26",
    category: "software",
    question: "Why can a memory leak occur in a long-running Node.js application even when garbage collection is enabled?",
    answer: "Garbage collection cannot reclaim objects that remain reachable through references, such as unbounded caches, retained closures, event listeners, or global collections.",
    hint: "The garbage collector only removes unreachable objects."
  },
  {
    id: "sw-27",
    category: "software",
    question: "What is the main difference between a message queue and a publish-subscribe topic?",
    answer: "A queue commonly distributes each message to one competing consumer, while a pub-sub topic can deliver a copy to multiple independent subscribers. Exact semantics depend on the messaging system.",
    hint: "One shared task versus multiple interested subscribers."
  },
  {
    id: "sw-28",
    category: "software",
    question: "A background job charges a customer, but the worker crashes before marking the job complete. What can happen when the job runs again?",
    answer: "The customer may be charged twice unless the operation is idempotent or the system can reliably reconcile its outcome.",
    hint: "The side effect happened, but the acknowledgment did not."
  },
  {
    id: "sw-29",
    category: "software",
    question: "What is the difference between a liveness failure and a safety failure in a distributed system?",
    answer: "A liveness failure means the system stops making progress. A safety failure means something incorrect happens, such as violating a consistency invariant.",
    hint: "One is about progress; the other is about correctness."
  },
  {
    id: "sw-30",
    category: "software",
    question: "You need to process a 10 GB file on a machine with limited RAM. Why is streaming preferable to reading the entire file into memory?",
    answer: "Streaming processes bounded chunks instead of loading the entire file, reducing peak memory usage.",
    hint: "Process a little at a time."
  },

  // ==================== GENERAL PUZZLES ====================
  {
    id: "gen-1",
    category: "general",
    question: "I have cities but no houses, forests but no trees, and rivers but no water. What am I?",
    answer: "A map.",
    hint: "You can fold me."
  },
  {
    id: "gen-2",
    category: "general",
    question: "You overtake the person in second place during a race. What position are you in now?",
    answer: "Second place.",
    hint: "You take their position, not the leader's."
  },
  {
    id: "gen-3",
    category: "general",
    question: "A farmer has 17 sheep. All but 9 run away. How many are left?",
    answer: "9 sheep.",
    hint: "Read the words carefully."
  },
  {
    id: "gen-4",
    category: "general",
    question: "A bat and a ball cost ₹110 together. The bat costs ₹100 more than the ball. How much does the ball cost?",
    answer: "₹5. The ball costs ₹5 and the bat costs ₹105.",
    hint: "If the ball costs x, the bat costs x + 100."
  },
  {
    id: "gen-5",
    category: "general",
    question: "You have three switches outside a closed room and one traditional incandescent bulb inside. You can enter the room only once. How can you identify which switch controls the bulb?",
    answer: "Turn on switch one for several minutes, then turn it off. Turn on switch two and enter the room. If the bulb is on, switch two controls it. If it is off but warm, switch one controls it. If it is off and cold, switch three controls it.",
    hint: "A bulb can reveal more than whether it is on."
  },
  {
    id: "gen-6",
    category: "general",
    question: "You have 8 identical-looking balls, but one is heavier. Using a balance scale only twice, how can you find the heavier ball?",
    answer: "Weigh three balls against three. If they balance, weigh the remaining two against each other. If they do not, take the heavier group of three and weigh one ball against another; if they balance, the third is heavier, otherwise the heavier side identifies it.",
    hint: "Divide the possibilities into groups of three."
  },
  {
    id: "gen-7",
    category: "general",
    question: "What number comes next: 2, 6, 12, 20, 30, ?",
    answer: "42. The pattern is n × (n + 1): 1×2, 2×3, 3×4, 4×5, 5×6, 6×7.",
    hint: "Look at the difference between consecutive numbers."
  },
  {
    id: "gen-8",
    category: "general",
    question: "A clock takes 5 seconds to strike 6 times. How long does it take to strike 12 times at the same rate?",
    answer: "11 seconds. Six strikes have five intervals; twelve strikes have eleven intervals.",
    hint: "Count the gaps between strikes, not just the strikes."
  },
  {
    id: "gen-9",
    category: "general",
    question: "A man looks at a photograph and says, 'Brothers and sisters, I have none, but this man's father is my father's son.' Who is in the photograph?",
    answer: "His son. Since he has no siblings, 'my father's son' refers to himself.",
    hint: "Who is his father's only son?"
  },
  {
    id: "gen-10",
    category: "general",
    question: "What comes once in a minute, twice in a moment, but never in a thousand years?",
    answer: "The letter M.",
    hint: "Look at the spelling, not the passage of time."
  },
  {
    id: "gen-11",
    category: "general",
    question: "You have two ropes. Each takes exactly one hour to burn, but they burn unevenly. How can you measure exactly 45 minutes?",
    answer: "Light rope one at both ends and rope two at one end. Rope one finishes in 30 minutes. Then light the other end of rope two; it will finish in another 15 minutes.",
    hint: "Burning a rope from both ends halves its total burn time."
  },
  {
    id: "gen-12",
    category: "general",
    question: "There are 100 lockers, all initially closed. Person one toggles every locker, person two every second locker, person three every third locker, and so on through person 100. Which lockers remain open?",
    answer: "The lockers with perfect-square numbers: 1, 4, 9, 16, 25, 36, 49, 64, 81, and 100. Only perfect squares have an odd number of divisors.",
    hint: "Most factors come in pairs, except for one special kind."
  },
  {
    id: "gen-13",
    category: "general",
    question: "A lily pad patch doubles in size every day. If it covers the entire lake on day 48, on which day does it cover half the lake?",
    answer: "Day 47.",
    hint: "Work backward one doubling."
  },
  {
    id: "gen-14",
    category: "general",
    question: "You have a 5-litre jug and a 3-litre jug with no measurement markings. How can you measure exactly 4 litres?",
    answer: "Fill the 5-litre jug and pour into the 3-litre jug, leaving 2 litres in the 5-litre jug. Empty the 3-litre jug, transfer the 2 litres into it, then refill the 5-litre jug. Pour into the 3-litre jug until full; exactly 4 litres remain in the 5-litre jug.",
    hint: "Use the smaller jug to leave a known remainder."
  },
  {
    id: "gen-15",
    category: "general",
    question: "If five machines make five widgets in five minutes, how long do 100 machines take to make 100 widgets at the same rate?",
    answer: "Five minutes. Each machine makes one widget in five minutes.",
    hint: "Scale the machines and the output together."
  },
  {
    id: "gen-16",
    category: "general",
    question: "A person has four daughters, and each daughter has one brother. How many children are there?",
    answer: "Five children: four daughters share the same brother.",
    hint: "The brother is shared."
  },
  {
    id: "gen-17",
    category: "general",
    question: "What three positive numbers give the same result when added together and multiplied together?",
    answer: "1, 2, and 3. Their sum and product are both 6.",
    hint: "Try the smallest whole numbers first."
  },
  {
    id: "gen-18",
    category: "general",
    question: "You have 10 bags of coins. One bag contains coins weighing 9 grams each, while the others contain 10-gram coins. With one digital scale reading, how can you identify the lighter bag?",
    answer: "Take 1 coin from bag one, 2 from bag two, and so on up to 10 from bag ten. The expected weight is 550 grams. The number of grams missing identifies the lighter bag.",
    hint: "Make the weight difference encode the bag number."
  },
  {
    id: "gen-19",
    category: "general",
    question: "A father is four times as old as his son. In 20 years, he will be twice as old as his son. How old are they now?",
    answer: "The son is 10 and the father is 40. In 20 years, they will be 30 and 60.",
    hint: "Let the son's current age be x."
  },
  {
    id: "gen-20",
    category: "general",
    question: "What number should replace the question mark: 1, 1, 2, 3, 5, 8, 13, ?",
    answer: "21. Each number is the sum of the previous two.",
    hint: "The next term depends on the last two."
  },

  // ==================== HISTORY ====================
  {
    id: "hist-1",
    category: "history",
    question: "Which ancient civilisation built Machu Picchu?",
    answer: "The Inca civilisation.",
    hint: "It flourished in the Andes."
  },
  {
    id: "hist-2",
    category: "history",
    question: "Which inventor is commonly associated with the development of movable-type printing in Europe during the 15th century?",
    answer: "Johannes Gutenberg.",
    hint: "Think of Mainz, Germany."
  },
  {
    id: "hist-3",
    category: "history",
    question: "Which empire developed an extensive road system and the cursus publicus communication and transport service?",
    answer: "The Roman Empire.",
    hint: "Its roads connected territories across Europe, North Africa, and Asia."
  },
  {
    id: "hist-4",
    category: "history",
    question: "What writing material was made from a plant growing along the Nile in ancient Egypt?",
    answer: "Papyrus.",
    hint: "It was an early paper-like material."
  },
  {
    id: "hist-5",
    category: "history",
    question: "In which present-day country did the Renaissance begin?",
    answer: "Italy.",
    hint: "Florence was a major early centre."
  },
  {
    id: "hist-6",
    category: "history",
    question: "Which Indian emperor fought the Kalinga War and later became associated with the promotion of Buddhism?",
    answer: "Ashoka, ruler of the Mauryan Empire.",
    hint: "His edicts were inscribed on pillars and rocks."
  },
  {
    id: "hist-7",
    category: "history",
    question: "Which ancient Indian university was a major centre of learning from around the fifth century CE?",
    answer: "Nalanda Mahavihara.",
    hint: "Its ruins are in present-day Bihar."
  },
  {
    id: "hist-8",
    category: "history",
    question: "Who founded the Mughal Empire in India in 1526?",
    answer: "Babur, after defeating Ibrahim Lodi at the First Battle of Panipat.",
    hint: "The battle marked a turning point in North Indian history."
  },
  {
    id: "hist-9",
    category: "history",
    question: "Which Indian mathematician is strongly associated with the Kerala school of astronomy and mathematics in the 14th century?",
    answer: "Madhava of Sangamagrama.",
    hint: "His work anticipated important infinite-series developments."
  },
  {
    id: "hist-10",
    category: "history",
    question: "Which event is commonly regarded as the immediate trigger for the First World War?",
    answer: "The assassination of Archduke Franz Ferdinand of Austria-Hungary in Sarajevo in 1914.",
    hint: "It occurred in the Balkans."
  },
  {
    id: "hist-11",
    category: "history",
    question: "In which year did India gain independence from British rule?",
    answer: "1947, on 15 August.",
    hint: "It was the year of Partition."
  },
  {
    id: "hist-12",
    category: "history",
    question: "Who led the Dandi March in 1930 as part of the Indian independence movement?",
    answer: "Mahatma Gandhi.",
    hint: "The march protested the British salt tax."
  },
  {
    id: "hist-13",
    category: "history",
    question: "Which ancient civilisation developed a writing system that remains largely undeciphered and built cities such as Harappa and Mohenjo-daro?",
    answer: "The Indus Valley Civilisation, also known as the Harappan Civilisation.",
    hint: "It flourished in the northwestern Indian subcontinent."
  },
  {
    id: "hist-14",
    category: "history",
    question: "Which treaty formally ended the state of war between Germany and the Allied Powers after the First World War?",
    answer: "The Treaty of Versailles, signed in 1919.",
    hint: "It was signed near Paris."
  },
  {
    id: "hist-15",
    category: "history",
    question: "Who was the first woman to become Prime Minister of India?",
    answer: "Indira Gandhi, who took office in 1966.",
    hint: "She was the daughter of Jawaharlal Nehru."
  },
  {
    id: "hist-16",
    category: "history",
    question: "Which Mauryan ruler is known for the Arthashastra tradition of statecraft, commonly associated with his adviser Kautilya?",
    answer: "Chandragupta Maurya founded the Mauryan Empire; Kautilya is traditionally associated with the Arthashastra.",
    hint: "Think of the dynasty that preceded Ashoka."
  },
  {
    id: "hist-17",
    category: "history",
    question: "Which European explorer reached India by sea in 1498 via the Cape of Good Hope?",
    answer: "Vasco da Gama, who arrived at Calicut on the Malabar Coast.",
    hint: "His voyage established a direct sea route from Europe."
  },
  {
    id: "hist-18",
    category: "history",
    question: "Which ancient Greek philosopher taught Alexander the Great?",
    answer: "Aristotle.",
    hint: "He was a student of Plato."
  },
  {
    id: "hist-19",
    category: "history",
    question: "Which Indian space mission became the first to successfully enter Mars orbit on its first attempt in 2014?",
    answer: "Mars Orbiter Mission, also called Mangalyaan, developed by ISRO.",
    hint: "It was India's first interplanetary mission."
  },
  {
    id: "hist-20",
    category: "history",
    question: "Which movement launched in 1942 demanded an end to British rule in India?",
    answer: "The Quit India Movement, launched by the Indian National Congress.",
    hint: "Its slogan called for the British to leave India."
  }
];

export const JOKES: readonly Joke[] = [
  // ==================== DEVELOPER HUMOUR ====================
  {
    id: "j-1",
    breakMinutes: 5,
    text: "My code works perfectly on my machine. Unfortunately, production doesn't have my machine."
  },
  {
    id: "j-2",
    breakMinutes: 5,
    text: "I fixed one bug and accidentally introduced three new features. My manager called it innovation."
  },
  {
    id: "j-3",
    breakMinutes: 5,
    text: "A SQL query walks into a bar, approaches two tables, and asks, 'Can I JOIN you?'"
  },
  {
    id: "j-4",
    breakMinutes: 5,
    text: "Why did the developer go broke? Too many cache misses and not enough cash hits."
  },
  {
    id: "j-5",
    breakMinutes: 5,
    text: "I would tell you a UDP joke, but I'm not sure you'd get it."
  },
  {
    id: "j-6",
    breakMinutes: 5,
    text: "There are two hard things in computer science: cache invalidation, naming things, off-by-one errors, and remembering how many hard things there are."
  },
  {
    id: "j-7",
    breakMinutes: 5,
    text: "My pull request has been waiting for approval so long that it has started applying for other jobs."
  },
  {
    id: "j-8",
    breakMinutes: 5,
    text: "I asked the API for a joke. It returned 404: Humour Not Found."
  },
  {
    id: "j-9",
    breakMinutes: 5,
    text: "The frontend and backend broke up. They couldn't agree on the contract, and communication was always asynchronous."
  },
  {
    id: "j-10",
    breakMinutes: 5,
    text: "Why do JavaScript developers wear glasses? Because they don't C#."
  },
  {
    id: "j-11",
    breakMinutes: 5,
    text: "My code reviewer said my function was too complex. I renamed it calculateSimpleValue. Problem solved."
  },
  {
    id: "j-12",
    breakMinutes: 5,
    text: "I named my database 'The Void'. Everything I put into it disappears into the unknown."
  },
  {
    id: "j-13",
    breakMinutes: 5,
    text: "A developer's favourite place to relax is a REST API."
  },
  {
    id: "j-14",
    breakMinutes: 5,
    text: "Why did the developer quit their job? They didn't get arrays."
  },
  {
    id: "j-15",
    breakMinutes: 5,
    text: "My debugging strategy is simple: change random things until the error gets embarrassed and leaves."
  },
  {
    id: "j-16",
    breakMinutes: 5,
    text: "I have a joke about recursion. First, you need to hear my joke about recursion."
  },
  {
    id: "j-17",
    breakMinutes: 5,
    text: "Why was the JavaScript developer sad? They didn't know how to null their feelings."
  },
  {
    id: "j-18",
    breakMinutes: 5,
    text: "I don't always test my code, but when I do, I do it in production."
  },
  {
    id: "j-19",
    breakMinutes: 5,
    text: "My server and I have something in common: both need more RAM and fewer requests."
  },
  {
    id: "j-20",
    breakMinutes: 5,
    text: "Why was the function feeling lonely? Nobody ever called it."
  },
  {
    id: "j-21",
    breakMinutes: 5,
    text: "The DevOps engineer's favourite exercise is running containers."
  },
  {
    id: "j-22",
    breakMinutes: 5,
    text: "I told my team I was going to refactor the code. They asked me to change the variable names instead. Apparently, that's the same thing here."
  },
  {
    id: "j-23",
    breakMinutes: 5,
    text: "My code is like my diet plan: beautifully documented, rarely followed, and full of unexpected side effects."
  },
  {
    id: "j-24",
    breakMinutes: 5,
    text: "Why do programmers prefer dark mode? Because light attracts bugs."
  },
  {
    id: "j-25",
    breakMinutes: 5,
    text: "The server said it needed a break. I gave it a 503 Service Unavailable."
  },
  {
    id: "j-26",
    breakMinutes: 5,
    text: "My Git history is a horror story. Every commit message says 'final-fix', 'final-fix-2', or 'please-work'."
  },
  {
    id: "j-27",
    breakMinutes: 5,
    text: "Why did the database administrator leave the party early? Too many connections."
  },
  {
    id: "j-28",
    breakMinutes: 5,
    text: "I told my computer I needed a break. It suggested I try breaking the build."
  },
  {
    id: "j-29",
    breakMinutes: 5,
    text: "The bug wasn't in the code. It was in the requirements, the environment, the deployment, and possibly the alignment of the planets."
  },
  {
    id: "j-30",
    breakMinutes: 5,
    text: "Why did the developer bring a ladder to work? To reach the high-level architecture."
  },
  {
    id: "j-31",
    breakMinutes: 5,
    text: "My manager asked me to make the website faster. I removed the loading spinner. Now the users are confused faster."
  },
  {
    id: "j-32",
    breakMinutes: 5,
    text: "I finally understood microservices: instead of one thing breaking, now twelve things break independently."
  },
  {
    id: "j-33",
    breakMinutes: 5,
    text: "What is a programmer's favourite snack? Cookies. Especially the ones that remember who you are."
  },
  {
    id: "j-34",
    breakMinutes: 5,
    text: "Why don't programmers like nature? It has too many bugs and no debugging console."
  },
  {
    id: "j-35",
    breakMinutes: 5,
    text: "I asked AI to fix my code. It rewrote the entire application and then confidently explained why my original code was wrong."
  },
  {
    id: "j-36",
    breakMinutes: 5,
    text: "Our sprint planning is very agile. We run in circles, change direction every day, and call it progress."
  },
  {
    id: "j-37",
    breakMinutes: 5,
    text: "A junior developer, a senior developer, and a production server walk into a bar. The junior asks for a drink, the senior asks for observability, and the server crashes."
  },
  {
    id: "j-38",
    breakMinutes: 5,
    text: "Why did the API developer break up with the database? Too many one-sided relationships and absolutely no connection pooling."
  },
  {
    id: "j-39",
    breakMinutes: 5,
    text: "My code doesn't have technical debt. It has a diversified portfolio of future problems."
  },
  {
    id: "j-40",
    breakMinutes: 5,
    text: "I spent three hours optimising a function that runs once a month. The function is now faster, and my career is still waiting for its performance review."
  },
  {
    id: "j-41",
    breakMinutes: 5,
    text: "Production is the only environment where a typo can become a company-wide incident."
  },
  {
    id: "j-42",
    breakMinutes: 5,
    text: "Why do backend developers make terrible magicians? They always expose the implementation details."
  },
  {
    id: "j-43",
    breakMinutes: 5,
    text: "I wanted to become a full-stack developer, so now I'm equally confused about the frontend and backend."
  },
  {
    id: "j-44",
    breakMinutes: 5,
    text: "My code passed every test except the one where a real human used it."
  },
  {
    id: "j-45",
    breakMinutes: 5,
    text: "The best thing about a distributed system is that when it fails, you can distribute the blame."
  },

  // ==================== DESI / OFFICE HUMOUR ====================
  {
    id: "j-46",
    breakMinutes: 5,
    text: "Boss: How much time do you need to fix this bug? Developer: Is this before or after the production deployment?"
  },
  {
    id: "j-47",
    breakMinutes: 5,
    text: "Indian developer's biggest fear isn't a production outage. It's the message: 'Bhai, ek chhota sa change hai.'"
  },
  {
    id: "j-48",
    breakMinutes: 5,
    text: "Client: This should take five minutes. Developer: Sure. Which five minutes of the next three working days?"
  },
  {
    id: "j-49",
    breakMinutes: 5,
    text: "Manager: Can you quickly explain the architecture? Developer: Haan sir. Pehle chai mangwa lete hain."
  },
  {
    id: "j-50",
    breakMinutes: 5,
    text: "My work-life balance is perfectly distributed: work in the foreground, life waiting in the background."
  },
  {
    id: "j-51",
    breakMinutes: 5,
    text: "Stand-up meeting update: Yesterday I fought a bug. Today I'm fighting the same bug. Blocker: the bug has more experience than me."
  },
  {
    id: "j-52",
    breakMinutes: 5,
    text: "The project manager said, 'We need to think outside the box.' So I opened a new Jira ticket."
  },
  {
    id: "j-53",
    breakMinutes: 5,
    text: "Developer ka asli talent coding nahi, 'It works on my machine' ko professional tone mein bolna hai."
  },
  {
    id: "j-54",
    breakMinutes: 5,
    text: "The client asked for a small feature. Three weeks later, we have a new database, two microservices, and a meeting to discuss the meeting."
  },
  {
    id: "j-55",
    breakMinutes: 5,
    text: "My laptop has 32 GB RAM, 16 CPU threads, and still freezes when I open the project manager's 47-tab spreadsheet."
  },
  {
    id: "j-56",
    breakMinutes: 5,
    text: "Office mein do cheezein kabhi khatam nahi hoti: meetings aur woh bug jo 'kal se aa raha hai'."
  },
  {
    id: "j-57",
    breakMinutes: 5,
    text: "Boss: Why is the task delayed? Developer: Because the estimated effort was calculated in optimism, not hours."
  },
  {
    id: "j-58",
    breakMinutes: 5,
    text: "I started working on my productivity. First, I made a Notion page. Then a task board. Then a dashboard. The original task is still pending."
  },
  {
    id: "j-59",
    breakMinutes: 5,
    text: "My code review feedback said 'Please simplify'. I deleted the entire feature. The reviewer approved it."
  },
  {
    id: "j-60",
    breakMinutes: 5,
    text: "The deadline is tomorrow, the requirements changed today, and the developer just discovered the project uses a framework nobody has maintained since 2018."
  }
];

export function puzzlesFor(category: FunCategory | "all"): Puzzle[] {
  return PUZZLES.filter(
    (p) => category === "all" || p.category === category
  );
}