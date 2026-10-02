import type { ProblemSpec } from "../types";

const LIST_DOC = "/**\n * Definition for singly-linked list.\n * function ListNode(val, next) {\n *   this.val = (val === undefined ? 0 : val)\n *   this.next = (next === undefined ? null : next)\n * }\n */";

export const LISTS: ProblemSpec[] = [
  {
    slug: "reverse-linked-list",
    functionName: "reverseList",
    params: ["head"],
    returnType: "ListNode",
    argTypes: ["ListNode"],
    returns: "ListNode",
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nfunction reverseList(head) {\n  \n}`,
    hints: [
      "Every next pointer currently faces forward. What must you remember before you flip one of them, so the rest of the list isn't lost?",
      "Walk the list once, keeping a 'previous' node that starts as null. At each node, save its next, point it back at previous, then step both forward. When you run off the end, previous is the new head.",
      "previous = null\ncurrent = head\nwhile current is not null:\n  following = current.next\n  current.next = previous\n  previous = current\n  current = following\nreturn previous",
    ],
    reference: `function reverseList(head) {
      let prev = null;
      let cur = head;
      while (cur !== null) {
        const next = cur.next;
        cur.next = prev;
        prev = cur;
        cur = next;
      }
      return prev;
    }`,
    // Different idea: copy values out, then build a fresh list from the back of the array.
    brute: `function reverseList(head) {
      const vals = [];
      for (let n = head; n !== null; n = n.next) vals.push(n.val);
      let out = null;
      for (let i = 0; i < vals.length; i++) out = new ListNode(vals[i], out);
      return out;
    }`,
    fuzz: `function gen(rand) {
      const n = Math.floor(rand() * 9);
      return [Array.from({ length: n }, () => Math.floor(rand() * 21) - 10)];
    }`,
    cases: [
      { input: [[1, 2, 3, 4, 5]], hidden: false },
      { input: [[1, 2]], hidden: false },
      { input: [[]], hidden: false, edge: "null-input", note: "A null head: there is nothing to reverse, and head.next would throw." },
      { input: [[1]], hidden: false, edge: "single", note: "A lone node is its own reverse; make sure its next stays null." },
      { input: [[9, 8, 7, 6, 5, 4, 3, 2, 1, 0]], hidden: true },
      { input: [[4, 4, 4]], hidden: true, edge: "all-equal", note: "Identical values: the output looks the same either way, so only a correct pointer flip (no lost or repeated nodes) gets the full length." },
      { input: [[1, 2, 3, 2, 1]], hidden: true },
      { input: [[-3, 0, 5, -3]], hidden: true, edge: "negatives" },
      { input: [[0, 0, 1]], hidden: true, edge: "zeros", note: "Zero values: checking if (head.val) instead of if (head) stops early." },
      { input: [Array.from({ length: 3000 }, (_, i) => i % 10)], hidden: true, edge: "large", note: "3000 nodes: a recursive reversal gets deep, and a quadratic one gets slow." },
    ],
  },
  {
    slug: "merge-two-sorted-lists",
    functionName: "mergeTwoLists",
    params: ["list1", "list2"],
    returnType: "ListNode",
    argTypes: ["ListNode", "ListNode"],
    returns: "ListNode",
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} list1\n * @param {ListNode} list2\n * @return {ListNode}\n */\nfunction mergeTwoLists(list1, list2) {\n  \n}`,
    hints: [
      "Both lists are already sorted. At any moment, which single node is the next one that has to go into the answer?",
      "Keep a pointer into each list and a dummy head for the result. Repeatedly attach the smaller front node and advance that list; when one list runs out, attach the whole remainder of the other.",
      "dummy = new node\ntail = dummy\nwhile a is not null and b is not null:\n  if a.value <= b.value:\n    tail.next = a\n    a = a.next\n  else:\n    tail.next = b\n    b = b.next\n  tail = tail.next\ntail.next = (a if a is not null else b)\nreturn dummy.next",
    ],
    reference: `function mergeTwoLists(list1, list2) {
      const dummy = new ListNode(0);
      let tail = dummy;
      let a = list1, b = list2;
      while (a !== null && b !== null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else { tail.next = b; b = b.next; }
        tail = tail.next;
      }
      tail.next = a !== null ? a : b;
      return dummy.next;
    }`,
    // Different idea: dump everything into an array, sort it, and rebuild.
    brute: `function mergeTwoLists(list1, list2) {
      const vals = [];
      for (let n = list1; n !== null; n = n.next) vals.push(n.val);
      for (let n = list2; n !== null; n = n.next) vals.push(n.val);
      vals.sort((x, y) => x - y);
      let out = null;
      for (let i = vals.length - 1; i >= 0; i--) out = new ListNode(vals[i], out);
      return out;
    }`,
    fuzz: `function gen(rand) {
      const make = () => {
        const n = Math.floor(rand() * 7);
        return Array.from({ length: n }, () => Math.floor(rand() * 15) - 4).sort((x, y) => x - y);
      };
      return [make(), make()];
    }`,
    cases: [
      { input: [[1, 2, 4], [1, 3, 4]], hidden: false },
      { input: [[2, 6, 9], [1, 3, 5, 7]], hidden: false },
      { input: [[], []], hidden: false, edge: "null-input", note: "Both heads are null: the answer is the empty list, and you must not touch .val." },
      { input: [[], [0]], hidden: false, edge: "null-input", note: "One list is empty: the other must be returned as is." },
      { input: [[5], []], hidden: true, edge: "null-input", note: "Same as above with the empty list on the right." },
      { input: [[1, 1, 1], [1, 1]], hidden: true, edge: "all-equal", note: "Every comparison ties: using < in place of <= still works, but dropping nodes on a tie does not." },
      { input: [[-9, -4, 0], [-7, -3]], hidden: true, edge: "negatives" },
      { input: [[1, 2, 3], [4, 5, 6]], hidden: true, edge: "boundary", note: "Every node of the first list goes before the second: the tail of the loop must attach the leftovers." },
      { input: [[7, 8, 9], [1, 2, 3]], hidden: true, edge: "reverse-sorted", note: "The second list entirely precedes the first." },
      { input: [[0, 0, 5, 5], [0, 5]], hidden: true, edge: "duplicates" },
      {
        input: [Array.from({ length: 800 }, (_, i) => Math.floor(i / 8)), Array.from({ length: 800 }, (_, i) => Math.floor((i + 4) / 8))],
        hidden: true,
        edge: "large",
        note: "800 nodes per list: building the merge recursively gets deep, and re-scanning for the minimum gets slow.",
      },
    ],
  },
  {
    slug: "linked-list-cycle",
    functionName: "hasCycle",
    params: ["head"],
    returnType: "boolean",
    argTypes: ["cycleList"],
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} head\n * @return {boolean}\n */\nfunction hasCycle(head) {\n  \n}`,
    hints: [
      "If the list has no end, walking forward forever never reaches null. How could you notice that you are going around in circles?",
      "Two pointers: a slow one moving one step and a fast one moving two. Inside a loop the fast pointer must eventually lap the slow one and land on the same node; if the fast one reaches null, there is no cycle. This needs O(1) extra space.",
      "slow = head\nfast = head\nwhile fast is not null and fast.next is not null:\n  slow = slow.next\n  fast = fast.next.next\n  if slow is the same node as fast:\n    return true\nreturn false",
    ],
    reference: `function hasCycle(head) {
      let slow = head, fast = head;
      while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow === fast) return true;
      }
      return false;
    }`,
    // Different idea: remember every node we have visited.
    brute: `function hasCycle(head) {
      const visited = new Set();
      for (let n = head; n !== null; n = n.next) {
        if (visited.has(n)) return true;
        visited.add(n);
      }
      return false;
    }`,
    fuzz: `function gen(rand) {
      const n = Math.floor(rand() * 9);
      const list = Array.from({ length: n }, () => Math.floor(rand() * 4));
      const pos = n === 0 || rand() < 0.4 ? -1 : Math.floor(rand() * n);
      return [{ list, pos }];
    }`,
    cases: [
      { input: [{ list: [3, 2, 0, -4], pos: 1 }], hidden: false },
      { input: [{ list: [1, 2], pos: 0 }], hidden: false },
      { input: [{ list: [1], pos: -1 }], hidden: false, edge: "single", note: "One node whose next is null: the fast pointer's next.next must be guarded." },
      { input: [{ list: [], pos: -1 }], hidden: false, edge: "null-input", note: "An empty list has no cycle; head is null so head.next would throw." },
      { input: [{ list: [1], pos: 0 }], hidden: true, edge: "cycle", note: "A single node that points to itself." },
      { input: [{ list: [1, 2, 3, 4, 5], pos: 4 }], hidden: true, edge: "cycle", note: "The tail loops back to itself, so the cycle is only one node long." },
      { input: [{ list: [5, 5, 5, 5], pos: -1 }], hidden: true, edge: "all-equal", note: "Equal values but no loop: comparing values instead of node identity would say true." },
      { input: [{ list: [1, 1, 1, 1], pos: 1 }], hidden: true, edge: "cycle", note: "Equal values and a real loop: only node identity tells the nodes apart." },
      { input: [{ list: [1, 2, 3, 4, 5, 6], pos: -1 }], hidden: true },
      { input: [{ list: Array.from({ length: 2000 }, (_, i) => i % 10), pos: 1000 }], hidden: true, edge: "large", note: "A long list with the loop in the middle: a solution that counts steps up to a fixed limit gives up too early." },
      { input: [{ list: Array.from({ length: 1000 }, () => 7), pos: -1 }], hidden: true, edge: "all-equal", note: "1000 identical values and no cycle: value comparison reports a cycle that isn't there." },
    ],
  },
  {
    slug: "middle-of-the-linked-list",
    functionName: "middleNode",
    params: ["head"],
    returnType: "ListNode",
    argTypes: ["ListNode"],
    returns: "ListNode",
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} head\n * @return {ListNode}\n */\nfunction middleNode(head) {\n  \n}`,
    hints: [
      "If you knew the length, how many steps from the head would the middle node be? Can you find it without measuring the list first?",
      "Run two pointers from the head: one moves one node at a time, the other two. When the fast pointer can't go any further, the slow one is at the middle. With an even count this lands on the second of the two middle nodes, which is what is asked.",
      "slow = head\nfast = head\nwhile fast is not null and fast.next is not null:\n  slow = slow.next\n  fast = fast.next.next\nreturn slow",
    ],
    reference: `function middleNode(head) {
      let slow = head, fast = head;
      while (fast !== null && fast.next !== null) {
        slow = slow.next;
        fast = fast.next.next;
      }
      return slow;
    }`,
    // Different idea: measure the length first, then walk half of it.
    brute: `function middleNode(head) {
      let n = 0;
      for (let p = head; p !== null; p = p.next) n++;
      let node = head;
      for (let i = 0; i < Math.floor(n / 2); i++) node = node.next;
      return node;
    }`,
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 10);
      return [Array.from({ length: n }, () => Math.floor(rand() * 100))];
    }`,
    cases: [
      { input: [[1, 2, 3, 4, 5]], hidden: false },
      { input: [[1, 2, 3, 4, 5, 6]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "The only node is the middle: the answer is the whole one-node list." },
      { input: [[1, 2]], hidden: false, edge: "two", note: "Even length with two nodes: the middle is the second node, not the first." },
      { input: [[3, 3, 3, 3]], hidden: true, edge: "all-equal", note: "All values tie, so only the node you return (second middle, giving two nodes) reveals an off-by-one." },
      { input: [[10, 20, 30]], hidden: true },
      { input: [[-5, -4, -3, -2]], hidden: true, edge: "negatives" },
      { input: [[0, 0, 7, 0, 0, 1]], hidden: true, edge: "zeros", note: "Zeros as data: tests that truthiness isn't used to decide whether to keep walking." },
      { input: [[8, 6, 4, 2, 0, -2, -4, -6, -8]], hidden: true, edge: "reverse-sorted" },
      { input: [Array.from({ length: 100 }, (_, i) => i + 1)], hidden: true, edge: "large", note: "The maximum of 100 nodes, even length: the answer starts at 51 and runs to the end." },
    ],
  },
  {
    slug: "remove-nth-node-from-end-of-list",
    functionName: "removeNthFromEnd",
    params: ["head", "n"],
    returnType: "ListNode",
    argTypes: ["ListNode", "value"],
    returns: "ListNode",
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} head\n * @param {number} n\n * @return {ListNode}\n */\nfunction removeNthFromEnd(head, n) {\n  \n}`,
    hints: [
      "The n-th node from the end is length - n steps from the front. How could you locate it in a single pass, without knowing the length?",
      "Use two pointers n nodes apart. Advance the lead pointer n steps, then move both until the lead falls off the end: the trailing pointer now sits just before the node to delete. A dummy node in front handles deleting the head.",
      "dummy = new node pointing at head\nlead = dummy\ntrail = dummy\nrepeat n times:\n  lead = lead.next\nwhile lead.next is not null:\n  lead = lead.next\n  trail = trail.next\ntrail.next = trail.next.next\nreturn dummy.next",
    ],
    reference: `function removeNthFromEnd(head, n) {
      const dummy = new ListNode(0, head);
      let lead = dummy, trail = dummy;
      for (let i = 0; i < n; i++) lead = lead.next;
      while (lead.next !== null) { lead = lead.next; trail = trail.next; }
      trail.next = trail.next.next;
      return dummy.next;
    }`,
    // Different idea: copy to an array, splice out the index, rebuild.
    brute: `function removeNthFromEnd(head, n) {
      const vals = [];
      for (let p = head; p !== null; p = p.next) vals.push(p.val);
      vals.splice(vals.length - n, 1);
      let out = null;
      for (let i = vals.length - 1; i >= 0; i--) out = new ListNode(vals[i], out);
      return out;
    }`,
    fuzz: `function gen(rand) {
      const size = 1 + Math.floor(rand() * 8);
      const list = Array.from({ length: size }, () => Math.floor(rand() * 10));
      return [list, 1 + Math.floor(rand() * size)];
    }`,
    cases: [
      { input: [[1, 2, 3, 4, 5], 2], hidden: false },
      { input: [[1, 2], 1], hidden: false },
      { input: [[1], 1], hidden: false, edge: "single", note: "Removing the only node leaves an empty list: the answer is null, and a missing dummy node breaks here." },
      { input: [[1, 2, 3], 3], hidden: false, edge: "boundary", note: "n equals the length, so the head itself is deleted." },
      { input: [[1, 2, 3, 4], 1], hidden: true, edge: "boundary", note: "n = 1 removes the tail: the trailing pointer must stop at the second-to-last node." },
      { input: [[1, 2], 2], hidden: true, edge: "two", note: "Two nodes, delete the head." },
      { input: [[7, 7, 7, 7], 2], hidden: true, edge: "all-equal", note: "Equal values: deleting 'a node with this value' by value, rather than by position, goes wrong." },
      { input: [[-1, -2, -3, -4, -5], 3], hidden: true, edge: "negatives" },
      { input: [[0, 1, 0, 2, 0], 3], hidden: true, edge: "zeros", note: "A zero is removed from the middle; zero is not a null to stop on." },
      { input: [[5, 6, 7, 8, 9, 10], 4], hidden: true },
      { input: [Array.from({ length: 30 }, (_, i) => i + 1), 30], hidden: true, edge: "large", note: "Maximum size (30 nodes) with n = 30: the lead pointer has to walk all the way to the end before the trail starts." },
    ],
  },
  {
    slug: "add-two-numbers",
    functionName: "addTwoNumbers",
    params: ["l1", "l2"],
    returnType: "ListNode",
    argTypes: ["ListNode", "ListNode"],
    returns: "ListNode",
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} l1\n * @param {ListNode} l2\n * @return {ListNode}\n */\nfunction addTwoNumbers(l1, l2) {\n  \n}`,
    hints: [
      "The digits are stored least significant first, which is the order you'd add them on paper. What do you need to carry from one column to the next?",
      "Walk both lists together, adding the two current digits plus the carry. Emit sum % 10, carry floor(sum / 10). Keep going while either list has digits left or the carry is non-zero, treating a missing digit as 0. Don't convert to a number: 100 digits overflow.",
      "dummy = new node\ntail = dummy\ncarry = 0\nwhile l1 is not null or l2 is not null or carry > 0:\n  total = carry\n  if l1 is not null: total = total + l1.value, l1 = l1.next\n  if l2 is not null: total = total + l2.value, l2 = l2.next\n  tail.next = new node(total mod 10)\n  tail = tail.next\n  carry = total div 10\nreturn dummy.next",
    ],
    reference: `function addTwoNumbers(l1, l2) {
      const dummy = new ListNode(0);
      let tail = dummy, carry = 0;
      while (l1 !== null || l2 !== null || carry > 0) {
        let total = carry;
        if (l1 !== null) { total += l1.val; l1 = l1.next; }
        if (l2 !== null) { total += l2.val; l2 = l2.next; }
        tail.next = new ListNode(total % 10);
        tail = tail.next;
        carry = Math.floor(total / 10);
      }
      return dummy.next;
    }`,
    // Different idea: turn each list into a big integer, add, and write the digits back out.
    brute: `function addTwoNumbers(l1, l2) {
      const read = (head) => {
        const digits = [];
        for (let p = head; p !== null; p = p.next) digits.push(p.val);
        return BigInt(digits.reverse().join(""));
      };
      const text = (read(l1) + read(l2)).toString();
      let out = null;
      for (let i = 0; i < text.length; i++) out = new ListNode(Number(text[i]), out);
      return out;
    }`,
    // Digits 0-9, at most 8 per number, no leading zero (the last stored digit) unless the number is 0.
    fuzz: `function gen(rand) {
      const make = () => {
        const n = 1 + Math.floor(rand() * 8);
        const d = Array.from({ length: n }, () => Math.floor(rand() * 10));
        if (n > 1 && d[n - 1] === 0) d[n - 1] = 1 + Math.floor(rand() * 9);
        return d;
      };
      return [make(), make()];
    }`,
    cases: [
      { input: [[2, 4, 3], [5, 6, 4]], hidden: false },
      { input: [[9, 9, 9, 9, 9, 9, 9], [9, 9, 9, 9]], hidden: false },
      { input: [[0], [0]], hidden: false, edge: "zeros", note: "0 + 0 must come back as the single digit 0, not an empty list." },
      { input: [[5], [5]], hidden: false, edge: "min-size", note: "One digit each and a carry out of the last column: the answer grows by a node ([0,1])." },
      { input: [[1], [9, 9, 9]], hidden: true, edge: "boundary", note: "Lists of different length, and the carry ripples through every digit of the longer one." },
      { input: [[3, 4, 2], [4]], hidden: true },
      { input: [[0], [7, 3, 1]], hidden: true, edge: "zeros", note: "One operand is zero: the other must pass through unchanged." },
      { input: [[1, 8], [0]], hidden: true, edge: "two" },
      { input: [[9, 9], [1]], hidden: true, edge: "duplicates", note: "Repeated 9s: the carry has to be added again at each node, not just once." },
      { input: [[4, 5, 6, 7, 8], [5, 4, 3, 2, 1]], hidden: true },
      { input: [Array.from({ length: 100 }, () => 9), [1]], hidden: true, edge: "large", note: "A 100-digit number: converting to a JS Number loses precision, and the carry travels through 100 nodes." },
    ],
  },
  {
    slug: "palindrome-linked-list",
    functionName: "isPalindrome",
    params: ["head"],
    returnType: "boolean",
    argTypes: ["ListNode"],
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} head\n * @return {boolean}\n */\nfunction isPalindrome(head) {\n  \n}`,
    hints: [
      "A palindrome reads the same from both ends, but a singly-linked list only lets you walk forward. What would let you read the back half in reverse?",
      "Find the middle with slow and fast pointers, reverse the second half in place, then walk the first half and the reversed half together comparing values. That is O(n) time and O(1) extra space (copying values to an array is O(n) space).",
      "find middle with slow and fast pointers\n(for odd length, step slow once more)\nsecond = reverse the list starting at slow\nleft = head\nwhile second is not null:\n  if left.value != second.value: return false\n  left = left.next\n  second = second.next\nreturn true",
    ],
    reference: `function isPalindrome(head) {
      let slow = head, fast = head;
      while (fast !== null && fast.next !== null) { slow = slow.next; fast = fast.next.next; }
      if (fast !== null) slow = slow.next;
      let prev = null;
      while (slow !== null) { const next = slow.next; slow.next = prev; prev = slow; slow = next; }
      let left = head, right = prev;
      while (right !== null) {
        if (left.val !== right.val) return false;
        left = left.next;
        right = right.next;
      }
      return true;
    }`,
    // Different idea: copy values out and compare against the reversed text.
    brute: `function isPalindrome(head) {
      const vals = [];
      for (let p = head; p !== null; p = p.next) vals.push(p.val);
      return vals.join(",") === vals.slice().reverse().join(",");
    }`,
    // Half the inputs are palindromes by construction, the rest are random.
    fuzz: `function gen(rand) {
      const n = 1 + Math.floor(rand() * 9);
      const list = Array.from({ length: n }, () => Math.floor(rand() * 3));
      if (rand() < 0.5) for (let i = 0; i < Math.floor(n / 2); i++) list[n - 1 - i] = list[i];
      return [list];
    }`,
    cases: [
      { input: [[1, 2, 2, 1]], hidden: false },
      { input: [[1, 2]], hidden: false },
      { input: [[1]], hidden: false, edge: "single", note: "A single node reads the same both ways: the answer is true." },
      { input: [[7, 7]], hidden: false, edge: "two", note: "Two equal nodes: the smallest even-length palindrome." },
      { input: [[1, 2, 3, 2, 1]], hidden: true, edge: "boundary", note: "Odd length: the middle node must be skipped, and it must not be compared with itself or with a neighbour." },
      { input: [[5, 5, 5, 5, 5]], hidden: true, edge: "all-equal" },
      { input: [[1, 0, 0]], hidden: true, edge: "zeros", note: "Contains zeros but is not a palindrome: the zero check must not make it look symmetric." },
      { input: [[1, 2, 3, 4, 5]], hidden: true, edge: "sorted" },
      { input: [[3, 1, 4, 1, 3, 9]], hidden: true },
      { input: [Array.from({ length: 3000 }, (_, i) => Math.min(i, 2999 - i) % 10)], hidden: true, edge: "large", note: "3000 nodes that mirror perfectly: a recursive or quadratic approach gets deep or slow." },
      { input: [Array.from({ length: 3000 }, (_, i) => (i === 1500 ? 5 : Math.min(i, 2999 - i) % 10))], hidden: true, edge: "large", note: "Mirrors perfectly except one node just past the middle: only a full comparison of both halves catches it." },
    ],
  },
  {
    slug: "remove-linked-list-elements",
    functionName: "removeElements",
    params: ["head", "val"],
    returnType: "ListNode",
    argTypes: ["ListNode", "value"],
    returns: "ListNode",
    starter: `${LIST_DOC}\n/**\n * @param {ListNode} head\n * @param {number} val\n * @return {ListNode}\n */\nfunction removeElements(head, val) {\n  \n}`,
    hints: [
      "Deleting a node means the node before it must skip over it. What if the node you need to delete is the head, which has nothing before it?",
      "Put a dummy node in front of the head so every real node has a predecessor. Walk with a pointer to the predecessor: if the next node holds the value, link past it (and stay put, since the new next could match too); otherwise move forward.",
      "dummy = new node pointing at head\nprev = dummy\nwhile prev.next is not null:\n  if prev.next.value == target:\n    prev.next = prev.next.next\n  else:\n    prev = prev.next\nreturn dummy.next",
    ],
    reference: `function removeElements(head, val) {
      const dummy = new ListNode(0, head);
      let prev = dummy;
      while (prev.next !== null) {
        if (prev.next.val === val) prev.next = prev.next.next;
        else prev = prev.next;
      }
      return dummy.next;
    }`,
    // Different idea: filter the values into an array and rebuild a fresh list.
    brute: `function removeElements(head, val) {
      const kept = [];
      for (let p = head; p !== null; p = p.next) if (p.val !== val) kept.push(p.val);
      let out = null;
      for (let i = kept.length - 1; i >= 0; i--) out = new ListNode(kept[i], out);
      return out;
    }`,
    fuzz: `function gen(rand) {
      const n = Math.floor(rand() * 9);
      return [Array.from({ length: n }, () => 1 + Math.floor(rand() * 4)), Math.floor(rand() * 6)];
    }`,
    cases: [
      { input: [[1, 2, 6, 3, 4, 5, 6], 6], hidden: false },
      { input: [[1, 2, 3], 5], hidden: false },
      { input: [[], 1], hidden: false, edge: "null-input", note: "A null head: there is nothing to remove, and dummy-less code dereferences null." },
      { input: [[7, 7, 7, 7], 7], hidden: false, edge: "all-equal", note: "Every node matches, so the result is empty and the head has to move several times." },
      { input: [[6, 6, 1, 2], 6], hidden: true, edge: "boundary", note: "Consecutive matches at the head: a single 'if head matches' check removes only one." },
      { input: [[1, 2, 3, 6], 6], hidden: true, edge: "boundary", note: "The match is the tail: the previous node's next must become null." },
      { input: [[1, 6, 6, 6, 2], 6], hidden: true, edge: "duplicates", note: "Adjacent matches in the middle: after unlinking one, the new next may match too." },
      { input: [[3, 0, 4, 0], 0], hidden: true, edge: "zeros", note: "The target value is 0, which is falsy: write val === target, not a truthiness test." },
      { input: [[1, 2, 3, 2, 1], 2], hidden: true },
      { input: [[1, 2], 1], hidden: true, edge: "two" },
      { input: [Array.from({ length: 3000 }, (_, i) => (i % 3 === 0 ? 5 : (i % 9) + 1)), 5], hidden: true, edge: "large", note: "3000 nodes with many matches: recursion gets deep, and deleting by re-scanning from the head gets slow." },
    ],
  },
];
