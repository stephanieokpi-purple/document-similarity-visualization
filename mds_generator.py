import os
import json
import spacy
import numpy as np
from sklearn.manifold import MDS
from sklearn.preprocessing import StandardScaler

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Dataset path
folder = os.path.join(os.getcwd(), "dataset")

doc_names = []
matrix = []

print(" Reading dataset from:", folder)

# -----------------------------
# Feature extraction (5 dimensions)
# -----------------------------
def extract_features(text):
    doc = nlp(text[:100000])

    features = {
        "PERSON": 0,
        "ORG": 0,
        "GPE": 0,
        "DATE": 0,
        "NORP": 0   # group/nationality (extra dimension)
    }

    for ent in doc.ents:
        if ent.label_ in features:
            features[ent.label_] += 1

    return list(features.values())

# -----------------------------
# Load documents
# -----------------------------
for file in os.listdir(folder):

    path = os.path.join(folder, file)

    if not os.path.isfile(path):
        continue

    print(" Processing:", file)

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read().strip()

        if len(text) == 0:
            print("Skipped empty:", file)
            continue

        vec = extract_features(text)

        print("Features:", vec)

        matrix.append(vec)

        # IMPORTANT: remove extension for consistency
        name = os.path.splitext(file)[0]
        doc_names.append(name)

# -----------------------------
# Safety check
# -----------------------------
if len(matrix) == 0:
    print(" ERROR: No valid documents found!")
    exit()

# -----------------------------
# MDS
# -----------------------------
X = np.array(matrix)
X = StandardScaler().fit_transform(X)

mds = MDS(n_components=2, random_state=42)
coords = mds.fit_transform(X)

# -----------------------------
# Save JSON
# -----------------------------
result = []

for i, name in enumerate(doc_names):
    result.append({
        "id": name,
        "x": float(coords[i][0]),
        "y": float(coords[i][1])
    })

with open("mds.json", "w") as f:
    json.dump(result, f, indent=4)

print("mds.json generated with", len(result), "documents!")