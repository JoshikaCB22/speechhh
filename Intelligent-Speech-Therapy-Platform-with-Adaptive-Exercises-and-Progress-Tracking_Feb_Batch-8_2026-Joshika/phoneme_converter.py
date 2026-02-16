import re
import nltk
import pyttsx3
from nltk.corpus import cmudict

print("Program started")


nltk.download("cmudict")

cmu = cmudict.dict()

sentence = """Artificial Intelligence is used in everyday life to power voice assistants,
recommend videos and products, detect spam and fraud, improve medical diagnosis,
enable self-driving features in vehicles, and make apps and websites smarter
by learning from user behavior over time."""

cleaned = re.sub(r'[^a-zA-Z\s]', '', sentence.lower())
words = cleaned.split()

with open("phonemes_output.txt", "w") as f:
    for word in words:
        phonemes = cmu.get(word, [["N/A"]])[0]
        f.write(f"{word} : {' '.join(phonemes)}\n")

print("Phonemes saved successfully")

engine = pyttsx3.init()
engine.setProperty('rate', 150)     
engine.setProperty('volume', 1.0)    

engine.say(sentence)
engine.runAndWait()

print("Speech generated successfully")
