import csv
import json
from collections import defaultdict as dd

def get_data():
    with open('data.csv', 'r') as f:
        f.readline()
        reader = csv.DictReader(f)
        # print(reader.fieldnames[3:-3])
        return reader.fieldnames[5:-3], list(reader)
def get_groups():
    with open('people_groups.csv', 'r') as f:
        reader = csv.DictReader(f)
        result = dd(list)
        for row in reader:
            if row["SKUPINA"] == "":
                continue
            result[row["IME"]].append(row["SKUPINA"][3:])
        return result

def get_enc_data():
    import secrets
    try:
        with open('enc.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        result = {"iv": secrets.token_hex(16), "key": secrets.token_hex(32)}
        with open('enc.json', 'w') as f:
            json.dump(result, f)
        return result
            

def save_data(data):
    import os
    import base64
    jdata = json.dumps(data)
    secrets = get_enc_data()
    out = os.popen(f"printf {repr(jdata)} | openssl aes-256-cbc -K {secrets['key']} -base64 -iv {secrets['iv']}", mode='r').read()
    

    with open('../static/gibit.json.enc', 'wb') as f:
        f.write(base64.b64decode(out))

def get_animals_mapping():
    with open('animals.txt', 'r') as f:
         animals = set(map(str.strip, f))
    with open('animals_mapping.csv', 'r') as f:
        existing = {r['Ime']: r['Šifra'] for r in csv.DictReader(f)}
    animals -= set(existing.keys())
    def get_code(name):
        if name not in existing:
            existing[name] = animals.pop()
        return existing[name]
    def persist():
        with open('animals_mapping.csv', 'w') as f:
            writer = csv.DictWriter(f, fieldnames=['Ime', 'Šifra'])
            writer.writeheader()
            for name, code in existing.items():
                writer.writerow({'Ime': name, 'Šifra': code})
    return get_code, persist
        
def main():
    headers, data = get_data()
    groups = get_groups()
    result = {"exercises": headers, "data": []}
    get_code, persist_code = get_animals_mapping()

    for row in data:
        if row["Ime"] == "":
            break
        if row["Ime"] not in groups:
            print(f"Skipping {row['Ime']}")
            continue
        result["data"].append({
            "name": get_code(row["Ime"]),
            "groups": groups[row["Ime"]],
            "vals": [int(row[header]) for header in headers],
        })
    save_data(result)
    persist_code()
    # print(*sorted(set(sum([r["group"] for r in result["data"]], []))), sep="\n")
    

if __name__ == '__main__':
    main()
