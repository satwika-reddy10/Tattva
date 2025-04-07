from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from utils.db import users_collection, documents_collection, chat_sessions_collection, queries_collection
from utils.file_utils import allowed_file, extract_text_from_pdf, extract_text_from_docx, FileProcessingError
from utils.nlp_utils import load_document, process_document_query
from werkzeug.utils import secure_filename
import os
from io import BytesIO
from docx import Document as DocxDocument
import uuid
from datetime import datetime
import logging
from bson import ObjectId

logger = logging.getLogger(__name__)

document_bp = Blueprint('document', __name__)

@document_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Only PDF and DOCX files are allowed"}), 400

        user_id = get_jwt_identity()
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        unique_id = str(uuid.uuid4())
        filename = f"doc_{unique_id}.{file_ext}"
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        
        file.save(filepath)
        documents, metadata = load_document(filepath)
        
        doc_data = {
            "user_id": user_id,
            "original_name": secure_filename(file.filename),
            "stored_name": filename,
            "upload_date": datetime.utcnow(),
            "file_type": file_ext,
            "size": os.path.getsize(filepath),
            "extracted_text": metadata.get("extracted_text", ""),
            "title": metadata.get("title", "Untitled Document"),
            "author": metadata.get("author", "Unknown Author"),
            "metadata": metadata,
            "version": 1
        }
        
        result = documents_collection.insert_one(doc_data)
        # File is kept in uploads for future use, not deleted here
        
        return jsonify({
            "message": "File uploaded successfully",
            "document_id": str(result.inserted_id),
            "title": doc_data["title"],
            "author": doc_data["author"]
        }), 201

    except FileProcessingError as e:
        logger.error(f"File processing error: {str(e)}")
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected upload error: {str(e)}", exc_info=True)
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": "Failed to upload file"}), 500

@document_bp.route('/preview/<filename>', methods=['GET'])
def preview_document(filename):
    try:
        if not filename.startswith('doc_'):
            return jsonify({"error": "Invalid file"}), 400
        
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        if filename.lower().endswith('.pdf'):
            return send_from_directory(
                current_app.config['UPLOAD_FOLDER'],
                filename,
                as_attachment=False,
                mimetype='application/pdf'
            )
        elif filename.lower().endswith('.docx'):
            doc = DocxDocument(filepath)
            text = "\n".join([para.text for para in doc.paragraphs[:20]])
            return jsonify({
                "type": "docx",
                "content": text,
                "filename": filename
            })
        
        return jsonify({"error": "Unsupported file type"}), 400

    except FileProcessingError as e:
        logger.error(f"Preview error: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error(f"Unexpected preview error: {str(e)}", exc_info=True)
        return jsonify({"error": "Failed to generate preview"}), 500

@document_bp.route("/process-document", methods=["POST"])
def process_document():
    filepath = None
    try:
        user_id = None
        try:
            verify_jwt_in_request()
            user_id = get_jwt_identity()
        except Exception:
            pass
        
        file = request.files.get('file')
        query_text = request.form.get("query", "").strip()
        chat_id = request.form.get("chat_id")
        chat_name = request.form.get("chat_name", "New Chat")

        if not query_text:
            return jsonify({"error": "Query cannot be empty"}), 400

        document_id = None
        documents = None
        metadata = None
        chat_history = []

        # Handle case with new file upload
        if file and file.filename != '':
            if not allowed_file(file.filename):
                return jsonify({"error": "Invalid file type"}), 400
                
            file_ext = file.filename.rsplit('.', 1)[1].lower()
            unique_id = str(uuid.uuid4())
            filename = f"doc_{unique_id}.{file_ext}"
            filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)
            
            documents, metadata = load_document(filepath)
            if not documents and not metadata.get("extracted_text"):
                raise FileProcessingError("Failed to process document content")
                
            if user_id:
                doc_data = {
                    "user_id": user_id,
                    "original_name": secure_filename(file.filename),
                    "stored_name": filename,
                    "upload_date": datetime.utcnow(),
                    "file_type": file_ext,
                    "size": os.path.getsize(filepath),
                    "extracted_text": metadata.get("extracted_text", ""),
                    "title": metadata.get("title", "Untitled Document"),
                    "author": metadata.get("author", "Unknown Author"),
                    "metadata": metadata,
                    "version": 1
                }
                result = documents_collection.insert_one(doc_data)
                document_id = str(result.inserted_id)
        # Handle query-only case with existing chat
        elif chat_id and user_id:
            chat_session = chat_sessions_collection.find_one({
                "_id": ObjectId(chat_id),
                "user_id": user_id
            })
            if not chat_session:
                return jsonify({"error": "Chat session not found or not authorized"}), 404
            chat_history = chat_session.get("history", [])
            document_id = chat_session.get("document_id")
            if document_id:
                doc = documents_collection.find_one({"_id": ObjectId(document_id)})
                if doc:
                    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], doc["stored_name"])
                    if os.path.exists(filepath):
                        documents, metadata = load_document(filepath)
                    else:
                        metadata = doc.get("metadata", {"title": "Untitled Document", "author": "Unknown Author"})
                        documents = []
            if not document_id:
                return jsonify({"error": "No document associated with this chat"}), 400
        else:
            return jsonify({"error": "Must provide a file or a valid chat_id with an associated document"}), 400

        # Set default query if new file but no query
        if not query_text and file:
            query_text = os.getenv("DEFAULT_QUERY", "Provide a detailed summary of this research paper.")

        # Create or fetch chat session
        chat_session = None
        if user_id:
            if chat_id:
                chat_session = chat_sessions_collection.find_one({"_id": ObjectId(chat_id), "user_id": user_id})
            if not chat_session:
                chat_data = {
                    "user_id": user_id,
                    "name": chat_name,
                    "created_at": datetime.utcnow(),
                    "last_updated": datetime.utcnow(),
                    "pinned": False,
                    "history": [],
                    "document_id": document_id,
                    "version": 1
                }
                result = chat_sessions_collection.insert_one(chat_data)
                chat_session = chat_sessions_collection.find_one({"_id": result.inserted_id})
            else:
                chat_history = chat_session.get("history", [])

        if not metadata:
            metadata = {"title": "Untitled Document", "author": "Unknown Author"}

        response = process_document_query(filepath or "", query_text, chat_history)

        if user_id and chat_session:
            query_entry = {
                "user_id": user_id,
                "chat_session_id": str(chat_session["_id"]),
                "document_id": document_id or chat_session.get("document_id"),
                "query": query_text,
                "response": response,
                "timestamp": datetime.utcnow(),
                "is_summary": "summar" in query_text.lower()
            }
            queries_collection.insert_one(query_entry)

            update_result = chat_sessions_collection.update_one(
                {"_id": chat_session["_id"], "version": chat_session["version"]},
                {
                    "$push": {
                        "history": {
                            "$each": [
                                {
                                    "type": "user",
                                    "content": query_text,
                                    "timestamp": datetime.utcnow().strftime("%H:%M:%S"),
                                    "file": {
                                        "name": file.filename if file else None,
                                        "document_id": document_id or chat_session.get("document_id")
                                    }
                                },
                                {
                                    "type": "response",
                                    "content": response,
                                    "timestamp": datetime.utcnow().strftime("%H:%M:%S")
                                }
                            ]
                        }
                    },
                    "$set": {
                        "last_updated": datetime.utcnow(),
                        "document_id": document_id or chat_session.get("document_id")
                    },
                    "$inc": {"version": 1}
                }
            )
            if update_result.modified_count == 0:
                raise ValueError("Chat update failed due to concurrent modification")

        return jsonify({
            "response": response,
            "title": metadata.get("title", "Untitled Document"),
            "author": metadata.get("author", "Unknown Author"),
            "chat_id": str(chat_session["_id"]) if chat_session else None
        })

    except FileProcessingError as e:
        logger.error(f"Document processing error: {str(e)}")
        if filepath and os.path.exists(filepath) and not document_id:  # Only remove if not stored in DB
            os.remove(filepath)
        return jsonify({"error": str(e)}), 400
    except ValueError as e:
        logger.error(f"Concurrency or data error: {str(e)}")
        if filepath and os.path.exists(filepath) and not document_id:
            os.remove(filepath)
        return jsonify({"error": str(e)}), 409
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}", exc_info=True)
        if filepath and os.path.exists(filepath) and not document_id:
            os.remove(filepath)
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500
