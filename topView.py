class Solution:
    def topView(self, root):
        result = []
        if not root:
            return result
        
        queue = [(root, 0)]
        top_view_map = {}

        while queue:
            node, line = queue.pop(0)

            if line not in top_view_map:
                top_view_map[line] = node.val

            if node.left:
                queue.append((node.left, line-1))
            if node.right:
                queue.append((node.right, line+1))

        for line in sorted(top_view_map.keys()):
            result.append(top_view_map[line])

        return result