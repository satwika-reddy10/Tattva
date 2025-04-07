from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.db import chat_sessions_collection, queries_collection, documents_collection
from bson import ObjectId
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
chat_bp = Blueprint('chat', __name__)

@chat_bp.route('/history', methods=['GET'])
@jwt_required()
def get_chat_history():
    try:
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"error": "Invalid user identity"}), 401
            
        chat_sessions = chat_sessions_collection.find({"user_id": user_id})
        chat_list = []

        for session in chat_sessions:
            doc_metadata = None
            title = "Untitled Document"
            author = "Unknown Author"
            if session.get("document_id"):
                doc = documents_collection.find_one({"_id": ObjectId(session["document_id"])})
                if doc:
                    doc_metadata = doc["metadata"]
                    title = doc.get("title", "Untitled Document")
                    author = doc.get("author", "Unknown Author")
            chat_list.append({
                "id": str(session["_id"]),
                "name": session.get("name", "Unnamed Chat"),
                "created_at": session.get("created_at", datetime.utcnow()).isoformat(),
                "last_updated": session.get("last_updated", datetime.utcnow()).isoformat(),
                "pinned": session.get("pinned", False),
                "history": session.get("history", []),
                "document_id": session.get("document_id"),
                "title": title,
                "author": author,
                "metadata": doc_metadata
            })

        return jsonify({"chats": chat_list})

    except Exception as e:
        logger.error(f"Error retrieving chat history: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to retrieve chat history"}), 500

@chat_bp.route('/create', methods=['POST'])
@jwt_required()
def create_chat():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        chat_name = data.get('name', 'New Chat')
        document_id = data.get('document_id')

        new_chat = {
            "user_id": user_id,
            "name": chat_name,
            "created_at": datetime.utcnow(),
            "last_updated": datetime.utcnow(),
            "pinned": False,
            "history": [],
            "document_id": document_id,
            "version": 1
        }

        result = chat_sessions_collection.insert_one(new_chat)
        return jsonify({
            "message": "Chat created successfully",
            "chat_id": str(result.inserted_id)
        }), 201

    except Exception as e:
        logger.error(f"Error creating chat: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to create chat"}), 500

@chat_bp.route('/<chat_id>', methods=['DELETE'])
@jwt_required()
def delete_chat(chat_id):
    try:
        user_id = get_jwt_identity()
        if not ObjectId.is_valid(chat_id):
            return jsonify({"error": "Invalid chat ID format"}), 400

        result = chat_sessions_collection.delete_one({
            "_id": ObjectId(chat_id), 
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            return jsonify({"error": "Chat not found or not authorized"}), 404
            
        queries_collection.delete_many({"chat_session_id": chat_id})
        return jsonify({"message": "Chat deleted successfully"})

    except Exception as e:
        logger.error(f"Error deleting chat: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to delete chat"}), 500

@chat_bp.route('/<chat_id>/pin', methods=['PUT'])
@jwt_required()
def pin_chat(chat_id):
    try:
        user_id = get_jwt_identity()
        if not ObjectId.is_valid(chat_id):
            return jsonify({"error": "Invalid chat ID format"}), 400

        chat_session = chat_sessions_collection.find_one({
            "_id": ObjectId(chat_id), 
            "user_id": user_id
        })
        
        if not chat_session:
            return jsonify({"error": "Chat not found or not authorized"}), 404

        new_pinned_status = not chat_session.get("pinned", False)
        
        update_result = chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id), "version": chat_session["version"]},
            {
                "$set": {
                    "pinned": new_pinned_status,
                    "last_updated": datetime.utcnow()
                },
                "$inc": {"version": 1}
            }
        )
        if update_result.modified_count == 0:
            return jsonify({"error": "Update failed due to concurrent modification"}), 409
        
        return jsonify({
            "message": "Chat pinned status updated", 
            "pinned": new_pinned_status
        })

    except Exception as e:
        logger.error(f"Error pinning chat: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to update pin status"}), 500

@chat_bp.route('/<chat_id>/rename', methods=['PUT'])
@jwt_required()
def rename_chat(chat_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not ObjectId.is_valid(chat_id):
            return jsonify({"error": "Invalid chat ID format"}), 400

        new_name = data.get('name')
        if not new_name or new_name.strip() == "":
            return jsonify({"error": "New name cannot be empty"}), 400

        chat_session = chat_sessions_collection.find_one({
            "_id": ObjectId(chat_id), 
            "user_id": user_id
        })
        
        if not chat_session:
            return jsonify({"error": "Chat not found or not authorized"}), 404

        update_result = chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id), "version": chat_session["version"]},
            {
                "$set": {
                    "name": new_name.strip(),
                    "last_updated": datetime.utcnow()
                },
                "$inc": {"version": 1}
            }
        )
        if update_result.modified_count == 0:
            return jsonify({"error": "Rename failed due to concurrent modification"}), 409
        
        return jsonify({"message": "Chat renamed successfully"})

    except Exception as e:
        logger.error(f"Error renaming chat: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to rename chat"}), 500

@chat_bp.route('/<chat_id>/messages', methods=['DELETE'])
@jwt_required()
def clear_chat_messages(chat_id):
    try:
        user_id = get_jwt_identity()
        
        if not ObjectId.is_valid(chat_id):
            return jsonify({"error": "Invalid chat ID format"}), 400

        chat_session = chat_sessions_collection.find_one({
            "_id": ObjectId(chat_id), 
            "user_id": user_id
        })
        
        if not chat_session:
            return jsonify({"error": "Chat not found or not authorized"}), 404

        update_result = chat_sessions_collection.update_one(
            {"_id": ObjectId(chat_id), "version": chat_session["version"]},
            {
                "$set": {
                    "history": [],
                    "last_updated": datetime.utcnow()
                },
                "$inc": {"version": 1}
            }
        )
        if update_result.modified_count == 0:
            return jsonify({"error": "Clear failed due to concurrent modification"}), 409
        
        return jsonify({"message": "Chat messages cleared successfully"})

    except Exception as e:
        logger.error(f"Error clearing chat messages: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to clear chat messages"}), 500