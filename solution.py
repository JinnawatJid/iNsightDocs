import sys

def solve():
    # Read all input from standard input
    input_data = sys.stdin.read().split()
    if not input_data:
        return

    n = int(input_data[0])

    adj = [[] for _ in range(n + 1)]
    idx = 1
    for _ in range(n - 1):
        u = int(input_data[idx])
        v = int(input_data[idx+1])
        w = int(input_data[idx+2])
        idx += 3
        adj[u].append((v, w))
        adj[v].append((u, w))

    q = int(input_data[idx])
    idx += 1

    LOG = 18
    up = [[1] * LOG for _ in range(n + 1)]
    depth_dist = [0] * (n + 1)
    depth_level = [0] * (n + 1)
    tin = [0] * (n + 1)

    timer = 0
    stack = [1]
    visited = [False] * (n + 1)
    visited[1] = True
    parent = [1] * (n + 1)

    while stack:
        u = stack.pop()
        timer += 1
        tin[u] = timer

        for v, w in adj[u]:
            if not visited[v]:
                visited[v] = True
                parent[v] = u
                depth_dist[v] = depth_dist[u] + w
                depth_level[v] = depth_level[u] + 1
                stack.append(v)

    for u in range(1, n + 1):
        up[u][0] = parent[u]

    for i in range(1, LOG):
        for u in range(1, n + 1):
            up[u][i] = up[up[u][i-1]][i-1]

    def get_lca(u, v):
        if depth_level[u] < depth_level[v]:
            u, v = v, u
        diff = depth_level[u] - depth_level[v]
        for i in range(LOG):
            if (diff >> i) & 1:
                u = up[u][i]
        if u == v:
            return u
        for i in range(LOG - 1, -1, -1):
            if up[u][i] != up[v][i]:
                u = up[u][i]
                v = up[v][i]
        return up[u][0]

    def get_dist(u, v):
        lca = get_lca(u, v)
        return depth_dist[u] + depth_dist[v] - 2 * depth_dist[lca]

    out = []
    for _ in range(q):
        k = int(input_data[idx])
        idx += 1
        nodes = []
        for _ in range(k):
            nodes.append(int(input_data[idx]))
            idx += 1

        nodes = list(set(nodes))

        if len(nodes) <= 1:
            out.append("0")
            continue

        nodes.sort(key=lambda x: tin[x])

        ans = 0
        for i in range(len(nodes)):
            u = nodes[i]
            v = nodes[(i + 1) % len(nodes)]
            ans += get_dist(u, v)

        out.append(str(ans // 2))

    print('\n'.join(out))

if __name__ == '__main__':
    solve()