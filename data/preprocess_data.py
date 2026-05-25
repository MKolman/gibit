import csv
import json
import random
from collections import defaultdict as dd

def get_data():
    with open('data_2026_05_08.csv', 'r') as f:
        reader = csv.DictReader(f)
        return reader.fieldnames[1: 11], list(reader)

def get_exceptions():
    with open('izjeme_2026_05_08.csv', 'r') as f:
        reader = csv.DictReader(f)
        return {row["Ime"]: row["Skupina"] for row in reader}

title_map = {
    "Spodnji odboj z dotikom tal (1 min)": "Spodnji odboj z dotikom tal z roko (60 sekund)",
    "Spodnji odboj sede (30 sek.)": "Spodnji odboj v sede - 30 sek.",
    "Zgornji - spodnji odboj (30 sek.)": "Izmenjava spodnji in zgornji odboj (30 sek)",
}
def fill_data(data):
    old_data = dd(list)
    with open('data_2024_12_08.csv') as f:
        reader = csv.DictReader(f)
        for l in reader:
            old_data[l["Ime"].split("#")[-1]].append(l)
    resolved = missing = 0
    for line in data:
        name = line["Ime in priimek"]
        key = name.split("#")[-1]
        missing += all(line[k] == "" for k in title_map)
        if all(line[k] == "" for k in title_map) and key in old_data:
            for old_line in old_data[key]:
                if all(old_line[k] for k in title_map.values()):
                    # print("Resolved", name)
                    resolved += 1
                    for k, v in title_map.items():
                        line[k] = old_line[v]
                    line["legacy_data"] = True
                    break
            else:
                pass
                # print("did not resolve", name)
    # print(data[0])
    print(f"resolved {resolved}/{missing} from old data")

def find_missing(name, groups):
    result = []
    for n in groups:
        if name.lower() in n.lower():
            result.append(n)
    if len(result) == 1:
        # print(f"Matched {name} to {result[0]}")
        return result[0]
    if len(result) == 0:
        manual_maps = {
            "simon kavčič": "Simon Kaučič",
            "Ljubiša Radonjič": "Ljubiša Rudonjić",
            "Valentyn KAzantcev": "Valentyn Kazantsev",
        }
        if name.strip() in manual_maps:
            return find_missing(manual_maps[name.strip()], groups)
        print(f"No match for {name}")
        return None
    print(f"Multiple matches for {name}: {result}")
    return None

def get_enc_data():
    import secrets
    try:
        with open('enc.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        result = {"iv": secrets.token_hex(16), "key": secrets.token_hex(32), "god_iv": secrets.token_hex(16), "god_key": secrets.token_hex(32)}
        with open('enc.json', 'w') as f:
            json.dump(result, f)
        return result
            

def save_data(data, get_code):
    import os
    import base64
    for row in data["data"]:
        try:
            row["sifra"] = get_code(row["name"])
        except KeyError:
            print(f"Missing code for {row['name']}")
    secrets = get_enc_data()
    jdata = json.dumps(data)
    csv_dump(data)
    out = os.popen(f"printf {repr(jdata)} | openssl aes-256-cbc -K {secrets['god_key']} -base64 -iv {secrets['god_iv']}", mode='r').read()  
    with open('../static/gibit_z_imeni2.json.enc', 'wb') as f:
        f.write(base64.b64decode(out))
    
    for row in data["data"]:
        try:
            row["name"] = get_code(row["name"])
        except KeyError:
            print(f"Missing code for {row['name']}")
    jdata = json.dumps(data)
    out = os.popen(f"printf {repr(jdata)} | openssl aes-256-cbc -K {secrets['key']} -base64 -iv {secrets['iv']}", mode='r').read()  
    with open('../static/gibit_zivali2.json.enc', 'wb') as f:
        f.write(base64.b64decode(out))

def csv_dump(data):
    with open("tmp.csv", "w") as f:
        w = csv.writer(f)
        w.writerow(["Ime", "Osnovna", "Rekreativna 1", "Rekreativna 2", "Nadaljevalna", "Spodnji odboj sede", "Spodnji odboj z dotikom tal", "Zgornji odboj sede", "Zgornji odboj s ploskom", "Zgornji-spodnji odboj", "Spodnji servis", "Zgornji servis", "Napadalni udarec", "Dosežena višina"])
        for row in data["data"]:
            lvls = [
                any("osnovna" in g.lower() for g in row["groups"]),
                any("rekreativna 1" in g.lower() for g in row["groups"]),
                any("rekreativna 2" in g.lower() or "1 /2" in g for g in row["groups"]),
                any("nadaljevalna" in g.lower() for g in row["groups"]),
            ]
            w.writerow([row["name"]] + lvls + row["vals"])

def get_animals_mapping():
    with open('animals.txt', 'r') as f:
        animals = list(map(str.split, f))
    with open('adj.txt', 'r') as f:
        adj = list(map(str.split, f))
    with open('animals_mapping.csv', 'r') as f:
        existing = {r['Ime']: r['Šifra'] for r in csv.DictReader(f)}
    def gen_random_name():
        spol, zival = random.choice(animals)
        pridev = random.choice(adj)
        return f"{pridev[spol=="F"]} {zival}"
    def get_code(name):
        if name in existing:
            return existing[name]
        code = gen_random_name()
        while code in existing.values():
            code = gen_random_name()
        existing[name] = code
        return code

    def persist():
        with open('animals_mapping.csv', 'w') as f:
            writer = csv.DictWriter(f, fieldnames=['Ime', 'Šifra'])
            writer.writeheader()
            for name, code in existing.items():
                writer.writerow({'Ime': name, 'Šifra': code})
    return get_code, persist

def remove_duplicates(data):
    per_name = dd(list)
    for row in data:
        per_name[row["Ime in priimek"]].append(row)
    result = []
    for name, rows in per_name.items():
        if len(rows) == 1:
            result.append(rows[0])
            continue

        print(f"Found {len(rows)} entries for {name}")


        for topic in ["POVPREČNA OCENA:", "sprejem - obramba", "podaja", "napad", "blok", "servis"]:
            coach_scores = [r[topic] for r in rows if r[topic] and r[topic] not in 'xX/-\\']
            if not coach_scores:
                coach_score = ""
            else:
                coach_score = sum(float(s.replace(',', '.')) for s in coach_scores) / len(coach_scores)
            rows[0][topic] = str(coach_score).replace('.', ',')
    

        height = [r["Telesna višina"] for r in rows if r["Telesna višina"]]
        if not height:
            height = ""
        else:
            height = height[0]
        rows[0]["Telesna višina"] = str(height)

        exs = list(sorted(title_map))
        print(exs)
        res = [[r[e] for e in exs] for r in rows]
        best = max(res, key=lambda r: (-r.count(''), sum(int(x) if x else 0 for x in r)))
        print(f"Best entry for {name} is {best} ({res})")
        for e, v in zip(exs, best):
            rows[0][e] = v

        rows[0]["TRENER"] = ", ".join(set(r["TRENER"] for r in rows if r["TRENER"]))
        result.append(rows[0])
    return result



def main():
    headers, data = get_data()
    data = remove_duplicates(data)
    fill_data(data)
    result = {"exercises": headers, "data": []}
    print(headers)
    exceptions = get_exceptions()
    for row in data:
        if row["Ime in priimek"] == "":
            continue
        if "5251" in row["Ime in priimek"]:
            print("row", row)
        result["data"].append({
            "name": row["Ime in priimek"],
            "groups": row["Skupina"],
            "coach": row["TRENER"],
            "legacy_data": row.get("legacy_data", False),
            "override": exceptions.get(row["Ime in priimek"], None),
            "vals": [float(row[header].replace(',', '.')) if ',' in row[header] else int(row[header]) if row[header] and row[header].isdigit() else None for header in headers],
        })
    get_code, persist_code = get_animals_mapping()
    save_data(result, get_code)
    persist_code()
    # print(*sorted(set(sum([r["group"] for r in result["data"]], []))), sep="\n")
    

if __name__ == '__main__':
    main()
