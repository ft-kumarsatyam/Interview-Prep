export const SOLUTIONS: Record<string, string> = {
  "subsets": `function subsets(nums) {
  var res = [[]];
  for (var i = 0; i < nums.length; i++) {
    var n = res.length;
    for (var j = 0; j < n; j++) res.push(res[j].concat([nums[i]]));
  }
  return res;
}`,
  "merge-intervals": `function merge(intervals) {
  var arr = intervals.map(function (x) { return [x[0], x[1]]; });
  arr.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
  var res = [];
  for (var i = 0; i < arr.length; i++) {
    if (res.length && arr[i][0] <= res[res.length - 1][1]) {
      res[res.length - 1][1] = Math.max(res[res.length - 1][1], arr[i][1]);
    } else res.push(arr[i]);
  }
  return res;
}`,
  "reverse-linked-list": `function reverseList(head) {
  var prev = null;
  while (head) { var nx = head.next; head.next = prev; prev = head; head = nx; }
  return prev;
}`,
  "merge-two-sorted-lists": `function mergeTwoLists(list1, list2) {
  var dummy = new ListNode(0, null), t = dummy;
  while (list1 && list2) {
    if (list1.val <= list2.val) { t.next = list1; list1 = list1.next; }
    else { t.next = list2; list2 = list2.next; }
    t = t.next;
  }
  t.next = list1 || list2;
  return dummy.next;
}`,
  "linked-list-cycle": `function hasCycle(head) {
  var slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow.next; fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}`,
  "middle-of-the-linked-list": `function middleNode(head) {
  var slow = head, fast = head;
  while (fast && fast.next) { slow = slow.next; fast = fast.next.next; }
  return slow;
}`,
  "remove-nth-node-from-end-of-list": `function removeNthFromEnd(head, n) {
  var len = 0, p = head;
  while (p) { len++; p = p.next; }
  var dummy = new ListNode(0, head), t = dummy;
  for (var i = 0; i < len - n; i++) t = t.next;
  t.next = t.next.next;
  return dummy.next;
}`,
  "add-two-numbers": `function addTwoNumbers(l1, l2) {
  var dummy = new ListNode(0, null), t = dummy, carry = 0;
  while (l1 || l2 || carry) {
    var s = carry + (l1 ? l1.val : 0) + (l2 ? l2.val : 0);
    carry = Math.floor(s / 10);
    t.next = new ListNode(s % 10, null);
    t = t.next;
    if (l1) l1 = l1.next;
    if (l2) l2 = l2.next;
  }
  return dummy.next;
}`,
  "palindrome-linked-list": `function isPalindrome(head) {
  var a = [];
  while (head) { a.push(head.val); head = head.next; }
  for (var i = 0, j = a.length - 1; i < j; i++, j--) if (a[i] !== a[j]) return false;
  return true;
}`,
  "remove-linked-list-elements": `function removeElements(head, val) {
  var dummy = new ListNode(0, head), t = dummy;
  while (t.next) {
    if (t.next.val === val) t.next = t.next.next;
    else t = t.next;
  }
  return dummy.next;
}`,
  "invert-binary-tree": `function invertTree(root) {
  if (!root) return null;
  var l = invertTree(root.left), r = invertTree(root.right);
  root.left = r; root.right = l;
  return root;
}`,
  "maximum-depth-of-binary-tree": `function maxDepth(root) {
  if (!root) return 0;
  return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
}`,
  "same-tree": `function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q) return false;
  return p.val === q.val && isSameTree(p.left, q.left) && isSameTree(p.right, q.right);
}`,
  "symmetric-tree": `function isSymmetric(root) {
  function mirror(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.val === b.val && mirror(a.left, b.right) && mirror(a.right, b.left);
  }
  return !root || mirror(root.left, root.right);
}`,
  "binary-tree-level-order-traversal": `function levelOrder(root) {
  var res = [];
  if (!root) return res;
  var level = [root];
  while (level.length) {
    res.push(level.map(function (n) { return n.val; }));
    var next = [];
    for (var i = 0; i < level.length; i++) {
      if (level[i].left) next.push(level[i].left);
      if (level[i].right) next.push(level[i].right);
    }
    level = next;
  }
  return res;
}`,
  "validate-binary-search-tree": `function isValidBST(root) {
  function ok(n, lo, hi) {
    if (!n) return true;
    if (n.val <= lo || n.val >= hi) return false;
    return ok(n.left, lo, n.val) && ok(n.right, n.val, hi);
  }
  return ok(root, -Infinity, Infinity);
}`,
  "diameter-of-binary-tree": `function diameterOfBinaryTree(root) {
  var best = 0;
  function h(n) {
    if (!n) return 0;
    var l = h(n.left), r = h(n.right);
    if (l + r > best) best = l + r;
    return 1 + Math.max(l, r);
  }
  h(root);
  return best;
}`,
  "path-sum": `function hasPathSum(root, targetSum) {
  if (!root) return false;
  if (!root.left && !root.right) return root.val === targetSum;
  return hasPathSum(root.left, targetSum - root.val) || hasPathSum(root.right, targetSum - root.val);
}`,
  "kth-smallest-element-in-a-bst": `function kthSmallest(root, k) {
  var arr = [];
  function inorder(n) {
    if (!n) return;
    inorder(n.left); arr.push(n.val); inorder(n.right);
  }
  inorder(root);
  return arr[k - 1];
}`,
  "binary-tree-right-side-view": `function rightSideView(root) {
  var res = [];
  if (!root) return res;
  var level = [root];
  while (level.length) {
    res.push(level[level.length - 1].val);
    var next = [];
    for (var i = 0; i < level.length; i++) {
      if (level[i].left) next.push(level[i].left);
      if (level[i].right) next.push(level[i].right);
    }
    level = next;
  }
  return res;
}`,
};
