class Solution:

    def isLeaf(self, node):
        return node is not None and node.left is None and node.right is None

    def leftBoundary(self, node, result):
        curr = node
        while curr:
            if not self.isLeaf(curr):
                result.append(curr.data)
            if curr.left:
                curr = curr.left
            else:
                curr = curr.right

    def rightBoundary(self, node, result):
        curr = node
        temp = []
        while curr:
            if not self.isLeaf(curr):
                temp.append(curr.data)
            if curr.right:
                curr = curr.right
            else:
                curr = curr.left
        result.extend(temp[::-1])

    def addLeaves(self, node, result):
        if self.isLeaf(node):
            result.append(node.data)
            return

        if node.left:
            self.addLeaves(node.left, result)
        if node.right:
            self.addLeaves(node.right, result)

    def boundaryTraversal(self, root):
        result = []
        if not root:
            return result
        if not self.isLeaf(root):
            result.append(root.data)
        # left boundary
        self.leftBoundary(root.left, result)

        # Leaf nodes
        self.addLeaves(root, result)

        # Right boundary
        self.rightBoundary(root.right, result)

        return result