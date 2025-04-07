from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client.get_database("InsightPaper")

users_collection = db["users"]
documents_collection = db["documents"]
chat_sessions_collection = db["chat_sessions"]
queries_collection = db["queries"]