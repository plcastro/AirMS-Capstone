from flask import current_app
import certifi
from pymongo import MongoClient


def init_mongo(app):
    client = MongoClient(app.config["MONGO_URI"], tlsCAFile=certifi.where())
    app.extensions["mongo_client"] = client
    app.extensions["mongo_db"] = client[app.config["MONGO_DB_NAME"]]


def get_db():
    return current_app.extensions["mongo_db"]
