🌟 Tattva – AI-Powered Research Analysis Platform
Tattva is a full-stack AI-driven web application that empowers users to effortlessly analyze, summarize, and interact with research documents and images. With a clean, responsive UI and advanced NLP and vision models under the hood, Tattva offers real-time content exploration like never before.

🚀 Key Features
🔍 Document Analysis

Upload and analyze PDF, DOCX, and image files (PNG, JPEG).

Get fast, accurate insights using cutting-edge AI models.

🧠 AI-Powered Summarization

Combines LangChain, HuggingFace embeddings, and FAISS vector search for smart document chunking, retrieval, and summarization.

🖼️ Image Processing

Uses the LLaVA-vision model (via TogetherAI API) to summarize visual content.

💬 Real-Time Chat Interface

Interactively query document/image content via a conversational interface.

Persistent chat history stored securely in MongoDB.

🔐 Secure Authentication

JWT-based login and session management.

🎨 Responsive UI with Dark Mode

Built using React with seamless document preview and user preferences.

⚙️ Scalable & Efficient

Uses file hashing, chunk-based processing, and RotatingFileHandler for optimized performance and logging.

🛑 Request Cancellation

Allows users to cancel long-running analysis tasks on demand.

🛠️ Tech Stack
Layer	Tools & Frameworks
Frontend	React, JavaScript, HTML, CSS
Backend	Flask, Python
Database	MongoDB
AI/NLP	LangChain, FAISS, HuggingFace, LLaVA (via TogetherAI)
Auth	JWT (JSON Web Tokens)
Others	Git, dotenv, RotatingFileHandler

⚙️ Installation Guide
✅ Prerequisites
Python 3.8+

Node.js 16+

MongoDB (local or cloud)

Git

📦 Clone the Repository
git clone https://github.com/satwika-reddy10/Tattva.git
cd Tattva
🔧 Backend Setup
cd backend
pip install -r requirements.txt
Create a .env file and add your environment variables:

MONGODB_URI=your_mongodb_uri
TOGETHERAI_API_KEY=your_api_key
JWT_SECRET=your_jwt_secret
Start the Flask server:

python app.py
🌐 Frontend Setup
cd frontend
npm install
npm start
🗄️ MongoDB Setup
Make sure MongoDB is running locally
OR

Use a cloud-based MongoDB URI (e.g., MongoDB Atlas) in .env.

💻 Access the Application
Frontend: http://localhost:3000

Backend API: http://localhost:5000

🧑‍💻 Usage Guide
Sign Up/Login – Create an account or log in securely.

Upload Files – Choose from PDF, DOCX, or image formats.

Analyze & Chat – Summarize documents or ask custom queries via chat.

Customize Preferences – Enable dark mode and other settings.

View Chat History – Access previously analyzed documents and interactions.

📌 Project Status
Actively developed and open for contributions! Ideal for use cases involving:

Research paper summarization

Legal document analysis

Visual content summarization

EdTech tools
