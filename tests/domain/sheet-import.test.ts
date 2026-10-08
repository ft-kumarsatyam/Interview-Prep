import { describe, expect, it } from "vitest";
import { matchCompanyNames, parseApnaGrid, parseArshCsv, parseBabbarJson, parseFrazCsv, sectionName, titleCase, titleFromUrl, type Grid } from "@/modules/dsa/domain/sheet-import";

describe("sheet import helpers", () => {
  it("title-cases words, keeping small words and roman numerals right", () => {
    expect(titleCase("best time to buy and sell stock ii")).toBe("Best Time to Buy and Sell Stock II");
    expect(sectionName("DYNAMIC PROGRAMING ")).toBe("Dynamic Programming");
    expect(sectionName("BFS")).toBe("BFS");
    expect(sectionName("Heaps / PQs")).toBe("Heaps / PQs");
  });

  it("derives titles from LeetCode and GfG URLs", () => {
    expect(titleFromUrl("https://leetcode.com/problems/two-sum/", (slug) => (slug === "two-sum" ? "Two Sum" : undefined))).toBe("Two Sum");
    expect(titleFromUrl("https://leetcode.com/problems/set-matrix-zeroes/")).toBe("Set Matrix Zeroes");
    expect(titleFromUrl("https://practice.geeksforgeeks.org/problems/word-wrap1646/1")).toBe("Word Wrap");
    expect(titleFromUrl("https://www.geeksforgeeks.org/chocolate-distribution-problem/")).toBe("Chocolate Distribution Problem");
  });

  it("splits a free-text company cell into known names, longest first", () => {
    expect(matchCompanyNames(" ABCO Accolite Amazon Goldman Sachs Microsoft + Facebook", ["Accolite", "Amazon", "Goldman Sachs", "Microsoft", "Goldman"])).toEqual(["Accolite", "Amazon", "Goldman Sachs", "Microsoft"]);
  });
});

describe("sheet parsers", () => {
  it("reads Love Babbar's JSON rows and drops duplicates", () => {
    const rows = [
      { "Topic:": "Array", "Problem: ": "Reverse the array", URL: "https://www.geeksforgeeks.org/write-a-program-to-reverse-an-array-or-string/" },
      { "Topic:": "Array", "Problem: ": "Reverse the array", URL: "https://www.geeksforgeeks.org/write-a-program-to-reverse-an-array-or-string/" },
      { "Topic:": "Array", "Problem: ": "", URL: "https://x.dev" },
    ];
    expect(parseBabbarJson({ Sheet1: rows })).toEqual([{ section: "Array", title: "Reverse the array", url: rows[0].URL }]);
    expect(() => parseBabbarJson([])).toThrow();
  });

  it("reads Arsh's CSV: sections, difficulty labels, and only rows after the header", () => {
    const csv = [
      "#CrackYourInternship Challenge,DSA Sheet by Arsh,,,",
      ",,Status,Microsoft,Adobe",
      ",Arrays ,,,~",
      "Easy,https://leetcode.com/problems/find-the-duplicate-number/,,,",
      "Easy/Medium,https://leetcode.com/problems/sort-colors/,,~,",
      ",GRAPHS,,,",
      "Hard,https://practice.geeksforgeeks.org/problems/word-wrap1646/1,,,",
    ].join("\n");
    expect(parseArshCsv(csv)).toEqual([
      { section: "Arrays", title: "", url: "https://leetcode.com/problems/find-the-duplicate-number/", difficulty: "Easy" },
      { section: "Arrays", title: "", url: "https://leetcode.com/problems/sort-colors/", difficulty: "Easy" },
      { section: "Graphs", title: "", url: "https://practice.geeksforgeeks.org/problems/word-wrap1646/1", difficulty: "Hard" },
    ]);
  });

  it("reads Fraz's CSV: difficulty bands, numbered lesson rows and editorial videos", () => {
    const csv = [
      ",DSA Sheet by FRAZ ( https://www.youtube.com/c/FrazMohammad ),",
      ",Arrays,Editorials ",
      ",EASY,",
      ",https://leetcode.com/problems/two-sum/,https://www.youtube.com/watch?v=o2WOhGSfx_8",
      ",MEDIUM / HARD ,",
      ",https://leetcode.com/problems/3sum/,",
      ",RECURSION,",
      ",1- What is recursion ,https://youtu.be/LgaFY8WyTX8",
      ",4- https://leetcode.com/problems/powx-n/ ,https://youtu.be/an9WRz8QhkA",
      ',"THAT WOULD BE TOO EASY FOR YOU , LETS DO MEDIUM",',
    ].join("\n");
    expect(parseFrazCsv(csv)).toEqual([
      { section: "Arrays", title: "", url: "https://leetcode.com/problems/two-sum/", difficulty: "Easy", video: "https://www.youtube.com/watch?v=o2WOhGSfx_8" },
      { section: "Arrays", title: "", url: "https://leetcode.com/problems/3sum/", difficulty: "Medium" },
      { section: "Recursion", title: "", url: "https://leetcode.com/problems/powx-n/", video: "https://youtu.be/an9WRz8QhkA" },
    ]);
  });

  it("reads the Apna College grid, taking difficulty from the legend colours", () => {
    const grid: Grid = [
      { A: { text: "Easy", fill: 3 }, B: { text: "Ideal Time : 5-10 mins" } },
      { A: { text: "Medium", fill: 5 } },
      { A: { text: "Hard", fill: 6 } },
      { A: { text: "Topics" }, B: { text: "Question (375)" }, C: { text: "Companies" } },
      { A: { text: "Arrays", fill: 3 }, B: { text: "Reverse the Array", link: "https://www.geeksforgeeks.org/write-a-program-to-reverse-an-array-or-string/" }, C: { text: " Infosys Moonfrog Labs" } },
      { A: { text: "Arrays", fill: 6 }, B: { text: "Trapping Rain Water", link: "https://leetcode.com/problems/trapping-rain-water/" }, D: { text: "two pointers" } },
      { A: { text: "Arrays", fill: 3 }, B: { text: "No link" } },
    ];
    expect(parseApnaGrid(grid)).toEqual([
      { section: "Arrays", title: "Reverse the Array", url: "https://www.geeksforgeeks.org/write-a-program-to-reverse-an-array-or-string/", difficulty: "Easy", companies: ["Infosys Moonfrog Labs"] },
      { section: "Arrays", title: "Trapping Rain Water", url: "https://leetcode.com/problems/trapping-rain-water/", difficulty: "Hard", remark: "two pointers" },
    ]);
  });
});
