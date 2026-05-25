from math import tanh
from dataclasses import dataclass
import csv
exs = "Spodnji odboj sede,Spodnji odboj z dotikom tal,Zgornji odboj sede,Zgornji odboj s ploskom,Zgornji-spodnji odboj,Spodnji servis,Zgornji servis,Napadalni udarec,Dosežena višina".split(",")
def make_transformer(m, s):
    tms = tanh(m/s)
    return lambda x: 10 * (tanh((x-m)/s) + tms)/(1 + tms)

@dataclass
class Perf:
    name: str
    vals: list[float]
    total_score: float = 0.0
    rank: int = 0

def compute(vals, trans):
    score = 0.0
    n = 0
    for v, tr in zip(vals, trans):
        if v is not None:
            score += tr(v)
            n += 1
    return score/n if n else 0.0

def read_csv(file_path="odbit_odbojkarski_karton.csv"):
    result = []
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        next(reader)  # Skip header
        for row in reader:
            result.append(Perf(row[0], [float(x) if x else None for x in row[2:-1]]))
            ts = result[-1].total_score = compute(result[-1].vals,  trans)
            # print(row[0], ts, row[1])
            assert abs(ts - float(row[1])) < 1e-6, f"{ts} != {row[1]}"
        result.sort(key=lambda p: p.total_score, reverse=True)
        for i, p in enumerate(result):
            p.rank = i + 1
    return result

trans = [
    make_transformer(20, 20),
    make_transformer(0, 20),
    make_transformer(30, 20),
    make_transformer(40, 20),
    make_transformer(30, 15),
    lambda x: x,
    lambda x: x,
    lambda x: x,
    make_transformer(290, 20),
]

def find_best_subset(data, k):
    from itertools import combinations
    scores = []
    for subset in combinations([0, 1, 2, 3, 4], k):
        subset = [*subset]
        data.sort(key=lambda p: compute([p.vals[i] for i in subset], [trans[i] for i in subset]), reverse=True)
        score = sum(abs(i+1 - p.rank) for i, p in enumerate(data))/len(data)
        scores.append((score,subset))
    scores.sort()
    return scores[:10]
data = read_csv()
# Spodnji odboj z dotikom tal : 19.7
# Spodnji odboj sede : 22.75
# Zgornji-spodnji odboj : 25.3
# test_set = [0, 1, 4, len(exs)-1]
# print("Testing for subset", [exs[i] for i in test_set])
# data.sort(key=lambda p: compute([p.vals[i] for i in test_set], [trans[i] for i in test_set]), reverse=True)
# score = sum(abs(i+1 - p.rank) for i, p in enumerate(data))/len(data)
# print(score)

for i in range(3, 4):
    scores = find_best_subset(data, i)
    for best_score, best_subset in scores[:10]:
        print(" & ".join([exs[i] for i in best_subset]), ":", round(best_score, 2))
    print()
