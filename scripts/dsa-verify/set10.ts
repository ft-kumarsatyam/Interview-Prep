/** Blind solutions for the seeded problems the Linked List Ladder judges (scripts/dsa-testcases/specs/ladder-lists-seeded.ts). */
export const SOLUTIONS: Record<string, string> = {
  "remove-duplicates-from-sorted-list": `function deleteDuplicates(head) {
  if (!head) return head;
  head.next = deleteDuplicates(head.next);
  return head.next && head.next.val === head.val ? head.next : head;
}`,
  "delete-the-middle-node-of-a-linked-list": `function deleteMiddle(head) {
  var n = 0, c;
  for (c = head; c; c = c.next) n++;
  if (n === 1) return null;
  var mid = Math.floor(n / 2);
  c = head;
  for (var i = 0; i < mid - 1; i++) c = c.next;
  c.next = c.next.next;
  return head;
}`,
  "maximum-twin-sum-of-a-linked-list": `function pairSum(head) {
  var st = [], c;
  for (c = head; c; c = c.next) st.push(c.val);
  var best = 0, n = st.length;
  c = head;
  for (var i = 0; i < n / 2; i++) { var s = c.val + st[n - 1 - i]; if (s > best) best = s; c = c.next; }
  return best;
}`,
  "odd-even-linked-list": `function oddEvenList(head) {
  var oddD = new ListNode(0), evenD = new ListNode(0), o = oddD, e = evenD, i = 1;
  for (var c = head; c; c = c.next, i++) { if (i % 2) { o.next = c; o = c; } else { e.next = c; e = c; } }
  e.next = null;
  o.next = evenD.next;
  return oddD.next;
}`,
  "partition-list": `function partition(head, x) {
  var small = [], big = [];
  for (var c = head; c; c = c.next) (c.val < x ? small : big).push(c);
  var all = small.concat(big);
  for (var i = 0; i < all.length; i++) all[i].next = all[i + 1] || null;
  return all.length ? all[0] : null;
}`,
  "swap-nodes-in-pairs": `function swapPairs(head) {
  if (!head || !head.next) return head;
  var second = head.next;
  head.next = swapPairs(second.next);
  second.next = head;
  return second;
}`,
  "rotate-list": `function rotateRight(head, k) {
  var nodes = [];
  for (var c = head; c; c = c.next) nodes.push(c);
  var n = nodes.length;
  if (n === 0) return null;
  var r = k % n;
  if (r === 0) return head;
  nodes[n - 1].next = nodes[0];
  nodes[n - r - 1].next = null;
  return nodes[n - r];
}`,
  "reorder-list": `function reorderList(head) {
  var nodes = [];
  for (var c = head; c; c = c.next) nodes.push(c);
  var i = 0, j = nodes.length - 1, prev = null;
  while (i <= j) {
    if (prev) prev.next = nodes[i];
    if (i === j) { prev = nodes[i]; break; }
    nodes[i].next = nodes[j];
    prev = nodes[j];
    i++; j--;
  }
  if (prev) prev.next = null;
}`,
  "swapping-nodes-in-a-linked-list": `function swapNodes(head, k) {
  var nodes = [];
  for (var c = head; c; c = c.next) nodes.push(c);
  var a = nodes[k - 1], b = nodes[nodes.length - k], t = a.val;
  a.val = b.val; b.val = t;
  return head;
}`,
  "reverse-linked-list-ii": `function reverseBetween(head, left, right) {
  var vals = [], c, i = 1;
  for (c = head; c; c = c.next, i++) if (i >= left && i <= right) vals.push(c.val);
  i = 1;
  for (c = head; c; c = c.next, i++) if (i >= left && i <= right) c.val = vals.pop();
  return head;
}`,
  "add-two-numbers-ii": `function addTwoNumbers(l1, l2) {
  function rev(h) { var p = null; while (h) { var n = h.next; h.next = p; p = h; h = n; } return p; }
  var a = rev(l1), b = rev(l2), carry = 0, d = new ListNode(0), t = d;
  while (a || b || carry) {
    var s = carry + (a ? a.val : 0) + (b ? b.val : 0);
    t.next = new ListNode(s % 10); t = t.next; carry = Math.floor(s / 10);
    a = a ? a.next : null; b = b ? b.next : null;
  }
  return rev(d.next);
}`,
  "remove-duplicates-from-sorted-list-ii": `function deleteDuplicates(head) {
  if (!head) return null;
  if (head.next && head.next.val === head.val) {
    var v = head.val;
    while (head && head.val === v) head = head.next;
    return deleteDuplicates(head);
  }
  head.next = deleteDuplicates(head.next);
  return head;
}`,
  "remove-nodes-from-linked-list": `function removeNodes(head) {
  var st = [];
  for (var c = head; c; c = c.next) {
    while (st.length && st[st.length - 1].val < c.val) st.pop();
    st.push(c);
  }
  for (var i = 0; i < st.length; i++) st[i].next = st[i + 1] || null;
  return st[0] || null;
}`,
  "insertion-sort-list": `function insertionSortList(head) {
  var sorted = null;
  while (head) {
    var nx = head.next;
    if (!sorted || head.val < sorted.val) { head.next = sorted; sorted = head; }
    else { var p = sorted; while (p.next && p.next.val <= head.val) p = p.next; head.next = p.next; p.next = head; }
    head = nx;
  }
  return sorted;
}`,
  "sort-list": `function sortList(head) {
  var n = 0, c;
  for (c = head; c; c = c.next) n++;
  var dummy = new ListNode(0, head);
  for (var size = 1; size < n; size *= 2) {
    var prev = dummy, cur = dummy.next;
    while (cur) {
      var left = cur, right = left, i;
      for (i = 1; i < size && right; i++) right = right.next;
      if (!right) { prev.next = left; break; }
      var rest = right.next; right.next = null; right = rest;
      var tail = right;
      for (i = 1; i < size && tail; i++) tail = tail.next;
      if (tail) { rest = tail.next; tail.next = null; } else rest = null;
      var a = left, b = right;
      while (a && b) { if (a.val <= b.val) { prev.next = a; a = a.next; } else { prev.next = b; b = b.next; } prev = prev.next; }
      prev.next = a || b;
      while (prev.next) prev = prev.next;
      cur = rest;
    }
  }
  return dummy.next;
}`,
  "split-linked-list-in-parts": `function splitListToParts(head, k) {
  var nodes = [];
  for (var c = head; c; c = c.next) nodes.push(c);
  var out = [], idx = 0, n = nodes.length;
  for (var p = 0; p < k; p++) {
    var size = Math.floor(n / k) + (p < n % k ? 1 : 0);
    if (size === 0) { out.push(null); continue; }
    out.push(nodes[idx]);
    nodes[idx + size - 1].next = null;
    idx += size;
  }
  return out;
}`,
  "merge-in-between-linked-lists": `function mergeInBetween(list1, a, b, list2) {
  var nodes = [];
  for (var c = list1; c; c = c.next) nodes.push(c);
  var t = list2;
  while (t.next) t = t.next;
  nodes[a - 1].next = list2;
  t.next = nodes[b + 1] || null;
  return list1;
}`,
  "merge-k-sorted-lists": `function mergeKLists(lists) {
  var heads = lists.slice(), d = new ListNode(0), t = d;
  for (;;) {
    var best = -1;
    for (var i = 0; i < heads.length; i++) if (heads[i] && (best < 0 || heads[i].val < heads[best].val)) best = i;
    if (best < 0) break;
    t.next = heads[best]; t = t.next; heads[best] = heads[best].next;
  }
  t.next = null;
  return d.next;
}`,
  "reverse-nodes-in-k-group": `function reverseKGroup(head, k) {
  var c = head, cnt = 0;
  while (c && cnt < k) { c = c.next; cnt++; }
  if (cnt < k) return head;
  var prev = reverseKGroup(c, k), cur = head;
  for (var i = 0; i < k; i++) { var n = cur.next; cur.next = prev; prev = cur; cur = n; }
  return prev;
}`,
};
