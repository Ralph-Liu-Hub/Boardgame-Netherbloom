# The Book route maps: each chapter's nodes in columns by their longest distance from the start; exits share the last column.
def nexts(n):
    nx=n.get("next")
    if not nx: return []
    return [(v,None) for v in nx] if isinstance(nx,list) else [(v,int(k)) for k,v in nx.items()]
def layout(ch):
    nodes={n["id"]:n for n in ch["nodes"]}
    indeg={i:0 for i in nodes}
    for n in nodes.values():
        for v,_ in nexts(n):
            if v in indeg: indeg[v]+=1
    roots=[i for i in nodes if indeg[i]==0]
    depth={}
    def visit(i,d):
        if depth.get(i,-1)>=d: return
        depth[i]=d
        for v,_ in nexts(nodes[i]):
            if v in nodes: visit(v,d+1)
    for r in roots: visit(r,0)
    last=max(depth.values())
    for i,n in nodes.items():
        if n["k"]=="o": depth[i]=last
    cols={}
    for i in nodes: cols.setdefault(depth[i],[]).append(i)
    return nodes,[cols[d] for d in sorted(cols)],roots
