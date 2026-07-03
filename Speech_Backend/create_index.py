from pinecone import Pinecone, ServerlessSpec

API_KEY = "pcsk_6W8y9H_7vLYTr2pdD2vJ9rLdjKt2DCG1tf3S9qJ2tAf3bfyBEhMpqSSHnpnbcCzU3YPnEz"
INDEX_NAME = "speech-words"

pc = Pinecone(api_key=API_KEY)

# Check if index exists
indexes = pc.list_indexes().names()

if INDEX_NAME not in indexes:

    pc.create_index(
        name=INDEX_NAME,
        dimension=384,
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

    print("Index Created")

else:
    print("Index Already Exists")