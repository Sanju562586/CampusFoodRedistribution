class Solution:

    def findBottomView(self, root, line):
        q = [(root, line)]
        bottom_view_map = {}
        while q:
            node, line = q.pop(0)
            bottom_view_map[line] = node.val
            if node.left:
                q.append((node.left, line-1))
            if node.right:
                q.append((node.right, line+1))
        result = []
        for line in sorted(bottom_view_map.keys()):
            result.append(bottom_view_map[line])
        return result
    
    def bottomView(self, root):
        if not root:
            return []
        result = self.findBottomView(root, 0)
        return result