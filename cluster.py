import os
import json
import nltk
import spacy
from collections import Counter
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.preprocessing import normalize

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')

# Load spaCy model for NER (run: python -m spacy download en_core_web_sm)
nlp = spacy.load("en_core_web_sm")

folder = "dataset"
documents = []
doc_names = []

def extract_ner_features(text):
    """
    Extract named entities (PERSON, ORG, GPE/LOC, DATE)
    and combine with TF-IDF tokens for richer clustering.
    """
    doc = nlp(text[:100000])  # spaCy limit safety
    entities = []
    for ent in doc.ents:
        if ent.label_ in ("PERSON", "ORG", "GPE", "LOC", "DATE", "NORP"):
            # Normalize entity text: lowercase, replace spaces with underscores
            normalized = ent.text.lower().replace(" ", "_")
            # Weight named entities by repeating them (boosts their TF-IDF)
            entities.extend([normalized] * 3)
    return " ".join(entities) + " " + text.lower()

# Load all documents
for file in sorted(os.listdir(folder)):
    if file.endswith("_docs.txt") or not os.path.isfile(os.path.join(folder, file)):
        continue
    path = os.path.join(folder, file)
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read().strip()
        if text:
            enriched = extract_ner_features(text)
            documents.append(enriched)
            doc_names.append(file)

# TF-IDF vectorization
vectorizer = TfidfVectorizer(
    max_features=3000,
    stop_words='english',
    ngram_range=(1, 2)   # include bigrams for better NER phrases
)
X = vectorizer.fit_transform(documents)
X = normalize(X)  # normalize for better KMeans performance

# KMeans clustering
k = 8
model = KMeans(n_clusters=k, random_state=42, n_init=10)
labels = model.fit_predict(X)

# Build clusters dict
clusters = {f"Cluster {i+1}": [] for i in range(k)}
for doc, label in zip(doc_names, labels):
    clusters[f"Cluster {label + 1}"].append(doc)

# Remove empty clusters, sort docs within each cluster
clusters = {k: sorted(v) for k, v in clusters.items() if v}

# Save to JSON
with open("clusters.json", "w", encoding="utf-8") as f:
    json.dump(clusters, f, indent=4)

print(f"clusters.json created with {len(clusters)} clusters!")