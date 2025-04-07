from flask import Flask
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv
import secrets
from routes.auth import auth_bp, set_bcrypt  # Import set_bcrypt
from routes.document import document_bp
from routes.chat import chat_bp

app = Flask(__name__)

# Configure CORS with specific origins and methods
cors = CORS(app, resources={
    r"/auth/*": {"origins": "*"},
    r"/document/*": {"origins": "*"},
    r"/chat/*": {"origins": "*"}
})

# Load environment variables
load_dotenv()

# App configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', secrets.token_hex(32))
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 3600  # Added: Set token expiration to 1 hour (3600 seconds)
app.config['UPLOAD_FOLDER'] = "uploads"
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit
app.secret_key = secrets.token_hex(32)

# Initialize extensions
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# Set bcrypt in auth module
set_bcrypt(bcrypt)  # Pass the bcrypt instance to auth.py

# Create uploads folder
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(document_bp, url_prefix='/document')
app.register_blueprint(chat_bp, url_prefix='/chat')

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True)