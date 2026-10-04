/** Aptitude catalog: three categories, 47 topics. Ids are stable (progress rows key off them). */

export type AptitudeCategoryId = "quantitative" | "logical" | "verbal";

export interface AptitudeCategory {
  id: AptitudeCategoryId;
  title: string;
  blurb: string;
  /** Overall time for a category mock test, in minutes. */
  mockMinutes: number;
}

export interface AptitudeTopic {
  id: string;
  category: AptitudeCategoryId;
  title: string;
  summary: string;
  /** Target seconds per question: beating it is the speed goal. */
  targetSec: number;
  /** The shortcuts worth memorising for this topic. */
  tips: string[];
}

export const APTITUDE_CATEGORIES: readonly AptitudeCategory[] = [
  {
    id: "quantitative",
    title: "Quantitative",
    blurb: "Arithmetic, algebra, geometry and probability. Build speed and accuracy for placement tests.",
    mockMinutes: 20,
  },
  {
    id: "logical",
    title: "Logical",
    blurb: "Recognise patterns, connect clues and draw conclusions. Reasoning drills that train fast thinking.",
    mockMinutes: 20,
  },
  {
    id: "verbal",
    title: "Verbal",
    blurb: "Grammar, vocabulary and sentence skills in a few seconds per question.",
    mockMinutes: 12,
  },
];

const q = (id: string, title: string, summary: string, targetSec: number, tips: string[]): AptitudeTopic => ({
  id,
  category: "quantitative",
  title,
  summary,
  targetSec,
  tips,
});
const l = (id: string, title: string, summary: string, targetSec: number, tips: string[]): AptitudeTopic => ({
  id,
  category: "logical",
  title,
  summary,
  targetSec,
  tips,
});
const v = (id: string, title: string, summary: string, targetSec: number, tips: string[]): AptitudeTopic => ({
  id,
  category: "verbal",
  title,
  summary,
  targetSec,
  tips,
});

export const APTITUDE_TOPICS: readonly AptitudeTopic[] = [
  // Quantitative
  q("speed-time-distance", "Speed, Time and Distance", "Distance = speed × time, average speed, relative speed, km/h ↔ m/s.", 45, [
    "km/h → m/s: multiply by 5/18. m/s → km/h: multiply by 18/5.",
    "Same distance at speeds a and b: average speed = 2ab / (a + b), not (a + b) / 2.",
    "Moving towards each other add speeds; same direction subtract them.",
  ]),
  q("number-system", "Number system", "Divisibility, remainders, units digit, factors and primes.", 40, [
    "Units digit of powers repeats in a cycle of at most 4: reduce the exponent mod 4.",
    "Divisible by 3 or 9: digit sum. By 11: alternating digit sum. By 4: last two digits.",
    "Number of factors of p^a·q^b is (a+1)(b+1).",
  ]),
  q("hcf-lcm", "HCF and LCM", "Highest common factor, lowest common multiple and their word problems.", 40, [
    "HCF × LCM = product of the two numbers.",
    "Bells ringing together again, or the largest equal tiles: think LCM for 'together again', HCF for 'largest equal'.",
    "Smallest number leaving remainder r with a, b, c: LCM(a, b, c) + r.",
  ]),
  q("time-work", "Time and Work", "Combined work rates, efficiency and wages.", 50, [
    "Work rate = 1 / days. Add rates for people working together.",
    "A and B take a and b days together: ab / (a + b) days.",
    "Pick total work = LCM of the days; every rate becomes a whole number.",
  ]),
  q("pipes-cisterns", "Pipes and Cisterns", "Inlet and outlet pipes, net filling rate.", 50, [
    "Inlets add (+), outlets subtract (−). Net rate = sum of rates.",
    "Choose capacity = LCM of the times to avoid fractions.",
  ]),
  q("trains-boats-streams", "Trains, Boats and Streams", "Train crossing problems and upstream/downstream speeds.", 50, [
    "Train passing a pole: distance = its length. Passing a platform: length + platform.",
    "Downstream = u + v, upstream = u − v. Boat speed = (down + up) / 2, stream = (down − up) / 2.",
    "Two trains opposite directions: add speeds. Same direction: subtract.",
  ]),
  q("permutation-combination", "Permutation and Combinations", "Counting arrangements and selections.", 50, [
    "Order matters → permutation nPr. Order does not matter → combination nCr.",
    "nCr = nC(n−r). Use the smaller of r and n−r.",
    "Arrangements of n items with repeats: n! / (a! b! …).",
  ]),
  q("probability", "Probability", "Coins, dice, cards and balls.", 45, [
    "P(at least one) = 1 − P(none).",
    "Two dice: 36 outcomes. Sum 7 has 6 ways (the most likely).",
    "Without replacement: multiply conditional probabilities.",
  ]),
  q("geometry", "Geometry", "Angles, triangles, polygons and circles.", 45, [
    "Interior angle sum of an n-gon: (n − 2) × 180°.",
    "Each exterior angle of a regular n-gon is 360° / n.",
    "Angle in a semicircle is 90°. Triangle exterior angle = sum of the two far interior angles.",
  ]),
  q("mixtures-alligations", "Mixtures and Alligations", "Weighted mixing of prices and concentrations.", 50, [
    "Alligation cross: (high − mean) : (mean − low) gives the ratio of low : high.",
    "Replacement: after n replacements of a fraction f, what remains is (1 − f)^n of the original.",
  ]),
  q("algebra", "Algebra", "Linear and quadratic equations, identities.", 45, [
    "(a + b)² = a² + 2ab + b². (a − b)(a + b) = a² − b².",
    "Quadratic ax² + bx + c: sum of roots = −b/a, product = c/a.",
    "Test the options by substitution when the equation looks heavy.",
  ]),
  q("trigonometry-heights", "Trigonometry & Height and Distance", "Standard ratios and angle-of-elevation problems.", 50, [
    "sin 30° = 1/2, sin 45° = 1/√2, sin 60° = √3/2. cos is the mirror image.",
    "tan 45° = 1, tan 30° = 1/√3, tan 60° = √3.",
    "Height = distance × tan(angle of elevation).",
  ]),
  q("progressions", "Progressions", "Arithmetic and geometric progressions.", 45, [
    "AP: nth term = a + (n − 1)d. Sum = n/2 × (first + last).",
    "GP: nth term = a·r^(n−1). Sum = a(r^n − 1)/(r − 1).",
    "Sum of first n naturals = n(n+1)/2. Of first n odds = n².",
  ]),
  q("ages", "Ages", "Present, past and future ages from ratios and sums.", 45, [
    "Define the younger person's age as x; write the others relative to x.",
    "The difference in ages never changes with time.",
  ]),
  q("profit-loss", "Profit and Loss", "Cost price, selling price, discount and marked price.", 40, [
    "Profit % = profit / CP × 100. Always measure against CP.",
    "SP = CP × (100 + profit%) / 100.",
    "Successive discounts of a% and b%: single discount = a + b − ab/100.",
  ]),
  q("simplification", "Simplification", "Fast arithmetic: BODMAS, squares, fractions and approximations.", 30, [
    "BODMAS: brackets, orders, division/multiplication, addition/subtraction left to right.",
    "Squares ending in 5: n5² = n(n+1) followed by 25. (35² = 3×4 | 25 = 1225).",
    "Round numbers first to estimate, then pick the nearest option.",
  ]),
  q("simple-interest", "Simple Interest", "SI = P·R·T / 100.", 35, [
    "SI = P × R × T / 100. Amount = P + SI.",
    "A sum becomes k times in T years at R%: R·T = (k − 1) × 100.",
  ]),
  q("compound-interest", "Compound Interest", "Amount = P(1 + R/100)^T, CI vs SI.", 50, [
    "CI − SI for 2 years = P(R/100)². For 3 years use the full expansion.",
    "Half-yearly: rate halves, periods double.",
    "Doubling time ≈ 72 / R years (rule of 72).",
  ]),
  q("averages", "Averages", "Mean, weighted mean and change in average.", 40, [
    "Sum = average × count. Work with sums.",
    "Adding a value x to n items changes the average by (x − old average) / (n + 1).",
  ]),
  q("ratio-proportion", "Ratio and Proportion", "Sharing, direct and inverse proportion.", 40, [
    "Split in ratio a : b: shares are a/(a+b) and b/(a+b) of the total.",
    "Direct proportion: divide. Inverse proportion (men and days): multiply.",
  ]),
  q("mensuration", "Mensuration", "Areas, volumes and surface areas.", 45, [
    "Circle: area πr², circumference 2πr. Use π = 22/7 when the radius is a multiple of 7.",
    "Cylinder volume πr²h, cone ⅓πr²h, sphere ⁴⁄₃πr³.",
    "Cube of side a: volume a³, surface 6a², diagonal a√3.",
  ]),
  q("partnership", "Partnership", "Sharing profit by capital × time.", 45, [
    "Profit shares ∝ capital × months invested.",
    "Equal time: ratio of capitals. Equal capital: ratio of times.",
  ]),
  q("logarithms", "Logarithms", "Laws of logs and evaluation.", 40, [
    "log(ab) = log a + log b. log(a/b) = log a − log b. log(a^n) = n·log a.",
    "log_b(a) = 1 means a = b. log_b(1) = 0.",
    "Change of base: log_b a = log a / log b.",
  ]),
  q("percentage", "Percentage", "Percent change, successive changes and population.", 35, [
    "x% of y = y% of x. Pick the easier one.",
    "Successive changes a% and b%: net = a + b + ab/100.",
    "Fractions to memorise: 1/3 = 33.3%, 1/6 = 16.7%, 1/7 = 14.3%, 1/8 = 12.5%, 1/9 = 11.1%.",
  ]),
  q("statistics", "Statistics", "Mean, median, mode and range.", 40, [
    "Sort first. Median of an even count = mean of the two middle values.",
    "Mode = most frequent value. Range = max − min.",
  ]),

  // Logical
  l("clocks", "Clocks", "Angles between hands and time gained or lost.", 45, [
    "Angle = |30H − 5.5M| degrees (take 360 − angle if it exceeds 180).",
    "Hands overlap 11 times in 12 hours, and are perpendicular 22 times in 12 hours.",
    "Minute hand gains 5.5° per minute on the hour hand.",
  ]),
  l("calendar", "Calendar", "Day of the week and odd days.", 45, [
    "Odd days: 100 years → 5, 200 → 3, 300 → 1, 400 → 0.",
    "Ordinary year = 1 odd day, leap year = 2.",
    "Same day each year shifts by +1 weekday (+2 after Feb 29).",
  ]),
  l("blood-relation", "Blood Relation", "Family-tree deduction.", 50, [
    "Draw the tree. Use ♂ and ♀, and mark generations as levels.",
    "'Father's sister' = aunt. 'Mother's brother' = maternal uncle. 'Mother's mother' = maternal grandmother.",
  ]),
  l("analogy", "Analogy", "Find the relation, apply it.", 25, [
    "Name the relation in a sentence first ('X is the tool used for Y').",
    "Check the order of the pair before the options.",
  ]),
  l("coding-decoding", "Coding Decoding", "Letter and number codes.", 40, [
    "Write letter positions: A=1 … Z=26. Opposite of a letter = 27 − position.",
    "Compare the first and last letters of a pair to detect shifts.",
  ]),
  l("puzzles", "Puzzles", "Ordering and deduction with clues.", 70, [
    "Convert every clue to a tiny diagram. Place fixed facts first.",
    "Process negative clues last. Eliminate options rather than constructing.",
  ]),
  l("dices", "Dices", "Opposite faces and dice views.", 45, [
    "A standard die: opposite faces sum to 7 (1–6, 2–5, 3–4).",
    "Two views share a common face: the faces not common are adjacent.",
  ]),
  l("series-completion", "Series Completion - Mix with Alphanumeric", "Find the rule in number and letter series.", 35, [
    "Check differences, then differences of differences, then ratios.",
    "For letters, convert to positions (A=1). Look for alternating series.",
    "Common ones: squares, cubes, primes, n² ± 1, ×2 + 1.",
  ]),
  l("syllogism", "Syllogism", "All/some/no statements and conclusions.", 45, [
    "Draw Venn circles. A conclusion follows only if it is true in every diagram.",
    "'Some' is reversible; 'All' is not. 'Some … are not' cannot be reversed.",
  ]),
  l("data-sufficiency", "Data Sufficiency", "Is the information enough?", 50, [
    "Judge each statement alone first, then together. Do not solve completely, just decide.",
    "A statement that adds nothing new is not sufficient.",
  ]),
  l("assumptions-conclusions", "Assumptions and Conclusions, Courses of Action", "Critical-thinking items.", 50, [
    "An assumption is an unstated premise the statement depends on.",
    "A conclusion must follow from the statement alone, not from outside knowledge.",
  ]),
  l("cube-cuboid", "Cube and Cuboid", "Painted cubes and cuts.", 45, [
    "n×n×n cube painted outside, cut into unit cubes: 3 faces = 8, 2 faces = 12(n−2), 1 face = 6(n−2)², 0 faces = (n−2)³.",
    "Cuts needed to split an a×b×c block into unit cubes: (a−1)+(b−1)+(c−1).",
  ]),
  l("direction-sense", "Direction Sense", "Distance and direction after a walk.", 40, [
    "Track the net displacement on x and y, then use Pythagoras.",
    "Right turn from North faces East. Left turn from North faces West.",
  ]),
  l("seating-arrangement", "Seating Arrangement", "Linear and circular seating deductions.", 70, [
    "Facing centre in a circle: your left is the clockwise neighbour. Facing outward it is flipped.",
    "Fix one person and place the others relative to them.",
  ]),

  // Verbal
  v("ordering-words", "Ordering of Words", "Arrange the words into a correct sentence.", 35, [
    "Find the subject, then the verb, then the object. Articles belong before their nouns.",
  ]),
  v("ordering-sentences", "Ordering of Sentences", "Arrange sentences into a coherent paragraph.", 60, [
    "Find the opening sentence: it introduces, with no pronoun pointing back.",
    "Pronouns (this, they, it) and connectors (however, therefore) belong after the sentence they refer to.",
  ]),
  v("spotting-errors", "Spotting Errors", "Find the part with the grammatical error.", 30, [
    "Check subject–verb agreement, tense, prepositions and articles in that order.",
    "'Each', 'every', 'neither', 'either' take a singular verb.",
  ]),
  v("one-word-substitutes", "One Word Substitutes", "A single word for a phrase.", 20, [
    "Break the word into root and suffix (-cide = killing, -phile = lover, -ology = study of).",
  ]),
  v("sentence-correction", "Sentence Correction", "Choose the best rewrite.", 35, [
    "Prefer the shortest correct version. Look for tense or agreement errors first.",
  ]),
  v("synonyms-antonyms", "Synonyms and Antonyms", "Word meanings and opposites.", 15, [
    "Read the question: some ask for the opposite. Read the whole sentence for the tone of the word.",
  ]),
  v("fill-blanks", "Fill in the Blanks", "Choose the word that fits.", 25, [
    "Predict a word before reading the options. Check the sentence's tone (positive or negative).",
  ]),
  v("idioms-phrases", "Idioms and Phrases", "Meanings of common idioms.", 20, [
    "Think of the picture and the situation where you would use it.",
  ]),
];

export const aptitudeTopicById = new Map(APTITUDE_TOPICS.map((t) => [t.id, t]));
export const aptitudeCategoryById = new Map(APTITUDE_CATEGORIES.map((c) => [c.id, c]));

export function topicsIn(category: AptitudeCategoryId): AptitudeTopic[] {
  return APTITUDE_TOPICS.filter((t) => t.category === category);
}

export function isCategoryId(value: string): value is AptitudeCategoryId {
  return aptitudeCategoryById.has(value as AptitudeCategoryId);
}
