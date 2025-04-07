from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
import re
import logging
import requests
from utils.file_utils import extract_metadata, extract_text_from_pdf, extract_text_from_docx, FileProcessingError
from typing import List, Tuple, Optional, Dict, Any
import os

logger = logging.getLogger(__name__)

embeddings = HuggingFaceEmbeddings(model_name=os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2"))
TOGETHER_API_KEY = os.getenv("TOGETHER_API_KEY", "your_key_here")
TOGETHER_API_URL = os.getenv("TOGETHER_API_URL", "https://api.together.xyz/v1/chat/completions")
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free")
MAX_CONTEXT_LENGTH = int(os.getenv("MAX_CONTEXT_LENGTH", 8000))

def load_document(file_path: str) -> Tuple[Optional[List[Any]], Dict]:
    """Load document, extract title/authors, and split into chunks."""
    if not file_path or not os.path.exists(file_path):
        return [], {"title": "Untitled Document", "author": "Unknown Author", "extracted_text": ""}
    try:
        metadata = extract_metadata(file_path)
        
        if file_path.endswith(".pdf"):
            loader = PyPDFLoader(file_path, extract_images=False)
            file_stream = open(file_path, 'rb')
            extracted_text = extract_text_from_pdf(file_stream)
            file_stream.close()
        elif file_path.endswith(".docx"):
            loader = UnstructuredWordDocumentLoader(file_path, mode="elements")
            file_stream = open(file_path, 'rb')
            extracted_text = extract_text_from_docx(file_stream)
            file_stream.close()
        else:
            logger.error(f"Unsupported file type: {file_path}")
            raise FileProcessingError(f"Unsupported file type: {file_path}")

        docs = []
        for doc in loader.lazy_load():
            docs.append(doc)
        
        first_page = docs[0].page_content if docs else ""
        if not metadata.get("title") or metadata["title"] == os.path.basename(file_path):
            title_match = re.search(r'^([^\n]{10,100})(?=\n\n|\nAbstract|\n\d+\sIntroduction)', first_page, re.MULTILINE)
            if title_match:
                metadata["title"] = title_match.group(1).strip()
            else:
                metadata["title"] = "Untitled Document"
        if not metadata.get("author") or metadata["author"] == "Unknown":
            author_match = re.search(r'(?<=[\n\r])([A-Z][\w\s\.,]+(?:,\s*[A-Z][\w\s\.,]+)*)(?=\n(?:[A-Za-z\s]*Department|[A-Za-z\s]*University|\nAbstract))', first_page)
            if author_match:
                metadata["author"] = author_match.group(1).strip()
            else:
                metadata["author"] = "Unknown Author"

        metadata["extracted_text"] = extracted_text

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
            is_separator_regex=False
        )
        split_docs = text_splitter.split_documents(docs)

        section_patterns = {
            "abstract": r"abstract|summary",
            "introduction": r"introduction|background",
            "methods": r"method|methodology|approach|experiment",
            "results": r"result|finding|outcome|data",
            "discussion": r"discussion|conclusion|implication",
            "references": r"reference|bibliography",
            "appendix": r"appendix|supplement"
        }

        for doc in split_docs:
            first_200 = doc.page_content[:200].lower()
            for section, pattern in section_patterns.items():
                if re.search(pattern, first_200):
                    doc.metadata["section"] = section
                    break
            else:
                doc.metadata["section"] = "other"

        return split_docs, metadata

    except FileProcessingError as e:
        logger.error(f"Document processing failed: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Unexpected document loading error: {str(e)}", exc_info=True)
        raise FileProcessingError(f"Unexpected error loading document: {str(e)}")

def format_metadata(metadata: Dict) -> str:
    formatted = ["DOCUMENT METADATA:"]
    formatted.append(f"Title: {metadata.get('title', 'Untitled Document')}")
    formatted.append(f"Author: {metadata.get('author', 'Unknown Author')}")
    formatted.append(f"Pages: {metadata.get('total_pages', 'Unknown')}")
    if metadata.get('is_research'):
        formatted.append("Type: Research paper")
    if metadata.get('sections'):
        formatted.append(f"Sections: {', '.join(metadata['sections'])}")
    return "\n".join(formatted)

def analyze_query_intent(query: str) -> Dict[str, float]:
    intent_scores = {
        "casual_chat": 0,
        "summary_request": 0,
        "technical_detail": 0,
        "comparison": 0,
        "metadata_query": 0
    }
    query_lower = query.lower()
    keyword_map = {
        "casual_chat": ["hi", "hello", "hey", "what's up", "how are you"],
        "summary_request": ["summarize", "overview", "main points", "tl;dr"],
        "technical_detail": ["method", "result", "data", "analysis", "how does"],
        "comparison": ["vs", "versus", "compare", "difference", "similarity"],
        "metadata_query": ["author", "title", "date", "pages", "figure", "table"]
    }
    for intent, keywords in keyword_map.items():
        intent_scores[intent] += sum(keyword in query_lower for keyword in keywords) * 0.3
    if re.search(r"explain (like|to) (a|me|i'm)", query_lower):
        intent_scores["casual_chat"] += 0.5
    if re.search(r"\b(advantage|disadvantage|pros?|cons?)\b", query_lower):
        intent_scores["comparison"] += 0.4
    total = sum(intent_scores.values())
    if total > 0:
        for intent in intent_scores:
            intent_scores[intent] /= total
    return intent_scores

def handle_metadata_query(query: str, metadata: Dict) -> Optional[str]:
    query_lower = query.lower()
    if "author" in query_lower:
        return f"The author is {metadata.get('author', 'Unknown Author')}."
    elif "title" in query_lower:
        return f"The title is '{metadata.get('title', 'Untitled Document')}'."
    elif "pages" in query_lower or "length" in query_lower:
        return f"The document has {metadata.get('total_pages', 'an unknown number of')} pages."
    elif any(term in query_lower for term in ["figure", "image"]):
        return f"There are {metadata.get('figure_count', 0)} figures and {metadata.get('image_count', 0)} images."
    elif "table" in query_lower:
        return f"The document contains {metadata.get('table_count', 0)} tables."
    elif "sections" in query_lower or "contents" in query_lower:
        if metadata.get("sections"):
            return "Main sections: " + ", ".join(metadata["sections"])
        return "The document structure information isn't available."
    return None

def prepare_context(query: str, documents: List, metadata: Dict, intent_scores: Dict, chat_history: List = None) -> str:
    context_parts = []
    if intent_scores["metadata_query"] > 0.3:
        context_parts.append(format_metadata(metadata))

    if chat_history:
        history_str = "\n".join(
            f"{entry['type'].upper()}: {entry['content']}" for entry in chat_history[-5:]
        )
        context_parts.append(f"PREVIOUS CONVERSATION:\n{history_str}")
        query_lower = query.lower()
        for entry in chat_history[-5:]:
            if entry["type"] == "user" and any(word in query_lower for word in entry["content"].lower().split()):
                context_parts.append(f"NOTE: You previously asked about '{entry['content']}', which may be related.")

    if documents:
        if intent_scores["technical_detail"] > 0.5:
            sections = ["methods", "results"]
        elif intent_scores["comparison"] > 0.4:
            sections = ["results", "discussion"]
        else:
            sections = ["abstract", "introduction", "conclusion"]
        relevant_docs = [d for d in documents if d.metadata.get("section") in sections]
        if not relevant_docs and documents:
            relevant_docs = documents[:3]
        context_content = "\n\n".join(
            f"[Section: {doc.metadata.get('section', 'other')}]\n{doc.page_content}"
            for doc in relevant_docs[:5]
        )
        if len(context_content) > MAX_CONTEXT_LENGTH:
            last_paragraph_end = context_content[:MAX_CONTEXT_LENGTH].rfind("\n\n")
            context_content = context_content[:last_paragraph_end] if last_paragraph_end > 0 else context_content[:MAX_CONTEXT_LENGTH]
        context_parts.append("DOCUMENT CONTENT:\n" + context_content)

    return "\n\n".join(context_parts)

def determine_response_style(intent_scores: Dict, metadata: Dict) -> Dict:
    style = {
        "tone": "professional",
        "structure": "paragraph",
        "depth": "detailed"
    }
    if intent_scores["casual_chat"] > 0.5:
        style["tone"] = "friendly"
    elif intent_scores["technical_detail"] > 0.6 and metadata.get("is_research"):
        style["tone"] = "academic"
    if intent_scores["comparison"] > 0.4:
        style["structure"] = "table"
    elif intent_scores["summary_request"] > 0.5:
        style["structure"] = "bullet"
    return style

def generate_llm_prompt(query: str, context: str, response_style: Dict) -> str:
    prompt_parts = []
    instruction = f"""You are an AI assistant with {response_style['tone']} tone. Respond with:
    - Depth: {response_style['depth']}
    - Structure: {response_style['structure']}
    - Style: Adapt to user's apparent knowledge level
    - Instruction: If relevant, reference prior conversation to maintain continuity."""
    if response_style["structure"] == "table":
        instruction += "\nFormat comparisons or lists as markdown tables when helpful"
    prompt_parts.append(instruction)
    if context:
        prompt_parts.append(f"CONTEXT:\n{context}")
    prompt_parts.append(f"USER QUERY:\n{query}")
    if "explain like i'm 5" in query.lower():
        prompt_parts.append("USE: Simple analogies, avoid jargon, max 3 sentences")
    if "advantages and disadvantages" in query.lower():
        prompt_parts.append("STRUCTURE: Bullet points for pros/cons with 1-sentence explanations")
    return "\n\n".join(prompt_parts)

def call_llm_api(prompt: str) -> str:
    try:
        headers = {
            "Authorization": f"Bearer {TOGETHER_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "model": LLAMA_MODEL,
            "messages": [{"role": "system", "content": prompt}],
            "temperature": 0.7 if "casual" in prompt.lower() else 0.3,
            "max_tokens": 1500
        }
        response = requests.post(TOGETHER_API_URL, json=data, headers=headers, timeout=30)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.Timeout:
        logger.error("LLM API request timed out")
        return "Request to AI service timed out. Please try again later."
    except requests.RequestException as e:
        logger.error(f"LLM API request failed: {str(e)}")
        return f"Failed to connect to AI service: {str(e)}"
    except KeyError as e:
        logger.error(f"Invalid LLM API response format: {str(e)}")
        return "Received an invalid response from the AI service."

def process_document_query(file_path: str, query: str, chat_history: List = None) -> str:
    documents, metadata = load_document(file_path)
    intent_scores = analyze_query_intent(query)
    if intent_scores["metadata_query"] > 0.7:
        metadata_response = handle_metadata_query(query, metadata)
        if metadata_response:
            return metadata_response
    context = prepare_context(query, documents, metadata, intent_scores, chat_history)
    response_style = determine_response_style(intent_scores, metadata)
    prompt = generate_llm_prompt(query, context, response_style)
    return call_llm_api(prompt)