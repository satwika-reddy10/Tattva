import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Send, Plus, FileText, Loader2, AlertTriangle, Paperclip, Search, Pin, Trash2, Edit, ChevronLeft, X, Copy, Trash, User, LogOut, Settings, Moon, Sun, LogIn, UserPlus, AlertCircle, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import "highlight.js/styles/github.css";
import "./Mainpage.css";

function DocumentPreview({ file, onClose }) {
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const readFile = () => {
      try {
        const reader = new FileReader();
        if (file.type === "application/pdf") {
          reader.onload = (e) => {
            setFileContent({
              type: "pdf",
              url: URL.createObjectURL(new Blob([e.target.result], { type: "application/pdf" }))
            });
            setLoading(false);
          };
          reader.readAsArrayBuffer(file);
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          setFileContent({
            type: "docx",
            name: file.name
          });
          setLoading(false);
        } else {
          setError("Unsupported file type for preview");
          setLoading(false);
        }
      } catch (err) {
        setError("Error reading file");
        setLoading(false);
      }
    };

    readFile();

    return () => {
      if (fileContent?.url) {
        URL.revokeObjectURL(fileContent.url);
      }
    };
  }, [file]);

  return (
    <div className="DocumentPreview">
      <div className="PreviewHeader">
        <h3>{file.name}</h3>
        <button onClick={onClose} className="ClosePreviewButton">
          <X size={20} />
        </button>
      </div>

      <div className="PreviewContent">
        {loading ? (
          <div className="LoadingPreview">
            <Loader2 className="animate-spin" size={24} />
            <span>Loading preview...</span>
          </div>
        ) : error ? (
          <div className="PreviewError">
            <AlertTriangle size={24} />
            <p>{error}</p>
          </div>
        ) : fileContent.type === "pdf" ? (
          <embed
            src={fileContent.url}
            type="application/pdf"
            width="100%"
            height="100%"
          />
        ) : (
          <div className="UnsupportedPreview">
            <FileText size={48} />
            <p>Preview not available for DOCX files</p>
            <p>You can still ask questions about this document</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Mainpage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    const isGuest = localStorage.getItem('isGuest') === 'true';
    return storedUser ? JSON.parse(storedUser) : isGuest ? { isGuest: true } : null;
  });

  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatAreaRef = useRef(null);

  useEffect(() => {
    const updateUser = () => {
      const storedUser = localStorage.getItem('user');
      const isGuest = localStorage.getItem('isGuest') === 'true';
      setUser(storedUser ? JSON.parse(storedUser) : isGuest ? { isGuest: true } : null);
    };

    updateUser();
    window.addEventListener('storage', updateUser);

    return () => {
      window.removeEventListener('storage', updateUser);
    };
  }, []);

  useEffect(() => {
    if (user && !user.isGuest) {
      fetchChatHistory();
    }
  }, [user]);

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/chat/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const fetchedChats = response.data.chats.map(chat => ({
        id: chat.id,
        name: chat.name,
        history: chat.history || [],
        pinned: chat.pinned
      }));
      setChats(fetchedChats);
      if (fetchedChats.length > 0 && !currentChat) {
        setCurrentChat(fetchedChats[0].id);
      }
    } catch (err) {
      console.error("Error fetching chat history:", err);
      setError("Failed to load chat history.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isGuest");
    setUser(null);
    setChats([]);
    setCurrentChat(null);
    navigate("/login");
  };

  const getCurrentChat = () => {
    const chat = chats.find((chat) => chat.id === currentChat);
    return chat || { id: null, history: [], name: "" };
  };

  const handleFileSelection = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload only PDF or DOCX files.");
      setSelectedFile(null);
    } else if (file.size > maxSize) {
      setError("File size exceeds 10MB limit.");
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
      setError(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleQuerySubmit = async (isSummary = false) => {
    if ((query.trim() !== "" || selectedFile || isSummary) && !isLoading) {
      setIsLoading(true);
      setError(null);

      const userMessage = {
        type: "user",
        content: isSummary ? "Summarize the document" : query.trim(),
        file: selectedFile ? selectedFile.name : null,
        timestamp: new Date().toLocaleTimeString(),
      };

      // Create a new chat if none exists
      if (!currentChat) {
        const newChatId = Date.now().toString();
        const newChat = { 
          id: newChatId, 
          name: "New Chat", 
          history: [userMessage], 
          pinned: false 
        };
        setChats(prev => [...prev, newChat]);
        setCurrentChat(newChatId);
      } else {
        // Add user message to current chat history
        const updatedChats = chats.map(chat => {
          if (chat.id === currentChat) {
            return {
              ...chat,
              history: [...(chat.history || []), userMessage]
            };
          }
          return chat;
        });
        setChats(updatedChats);
      }

      const formData = new FormData();
      if (selectedFile) formData.append('file', selectedFile);
      formData.append('query', isSummary ? "Summarize the document" : query.trim());
      formData.append('chat_id', currentChat || Date.now().toString());
      formData.append('chat_name', getCurrentChat().name || "New Chat");

      try {
        const token = localStorage.getItem('token');
        const response = await axios.post('http://localhost:5000/document/process-document', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });

        const responseEntry = {
          type: "response",
          content: response.data.response,
          timestamp: new Date().toLocaleTimeString(),
        };

        // Add bot response to chat history
        const updatedChats = chats.map(chat => {
          if (chat.id === currentChat) {
            return {
              ...chat,
              history: [...(chat.history || []), responseEntry]
            };
          }
          return chat;
        });
        setChats(updatedChats);

        // Refresh chat history for persistent storage
        await fetchChatHistory();

        if (!isSummary) setQuery("");
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (error) {
        const errorMessage = error.response?.data?.error || "An unexpected error occurred";
        setError(errorMessage);
        
        // Add error message to chat history
        const errorEntry = {
          type: "error",
          content: errorMessage,
          timestamp: new Date().toLocaleTimeString(),
        };
        
        const updatedChats = chats.map(chat => {
          if (chat.id === currentChat) {
            return {
              ...chat,
              history: [...(chat.history || []), errorEntry]
            };
          }
          return chat;
        });
        setChats(updatedChats);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNewChat = async () => {
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      name: "New Chat",
      history: [],
      pinned: false
    };
    
    setChats(prev => [...prev, newChat]);
    setCurrentChat(newChatId);
    setQuery("");
    setSelectedFile(null);
    setError(null);
    
    if (user && !user.isGuest) {
      try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/chat/create', {
          name: "New Chat"
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchChatHistory();
      } catch (err) {
        console.error("Error creating new chat:", err);
      }
    }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    
    if (window.confirm("Are you sure you want to delete this chat?")) {
      try {
        const updatedChats = chats.filter(chat => chat.id !== chatId);
        setChats(updatedChats);
        
        if (currentChat === chatId) {
          if (updatedChats.length > 0) {
            setCurrentChat(updatedChats[0].id);
          } else {
            setCurrentChat(null);
          }
        }
        
        if (user && !user.isGuest) {
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:5000/chat/${chatId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (err) {
        console.error("Error deleting chat:", err);
        setError("Failed to sync deletion with server, but chat was removed locally.");
      }
    }
  };

  const editChat = async (chatId, e) => {
    e.stopPropagation();
    
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const newName = prompt("Enter new chat name:", chat.name);
    if (newName && newName.trim() !== "") {
      try {
        const updatedChats = chats.map(c => {
          if (c.id === chatId) {
            return { ...c, name: newName.trim() };
          }
          return c;
        });
        setChats(updatedChats);
        
        if (user && !user.isGuest) {
          const token = localStorage.getItem('token');
          await axios.put(`http://localhost:5000/chat/${chatId}/rename`, { 
            name: newName.trim() 
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (err) {
        console.error("Error renaming chat:", err);
        setError("Failed to sync rename with server, but chat was renamed locally.");
      }
    }
  };

  const pinChat = async (chatId, e) => {
    e.stopPropagation();
    
    try {
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return;
      
      const newPinnedStatus = !chat.pinned;
      
      const updatedChats = chats.map(c => {
        if (c.id === chatId) {
          return { ...c, pinned: newPinnedStatus };
        }
        return c;
      });
      setChats(updatedChats);
      
      if (user && !user.isGuest) {
        const token = localStorage.getItem('token');
        await axios.put(`http://localhost:5000/chat/${chatId}/pin`, {
          pinned: newPinnedStatus
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error("Error toggling pin status:", err);
      setError("Failed to sync pin status with server, but chat was updated locally.");
    }
  };

  const clearChat = async () => {
    if (currentChat && window.confirm("Clear all messages in this chat?")) {
      try {
        const updatedChats = chats.map(chat => {
          if (chat.id === currentChat) {
            return { ...chat, history: [] };
          }
          return chat;
        });
        setChats(updatedChats);
        
        if (user && !user.isGuest) {
          const token = localStorage.getItem('token');
          await axios.delete(`http://localhost:5000/chat/${currentChat}/messages`, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
      } catch (err) {
        console.error("Error clearing chat:", err);
        setError("Failed to sync clearing with server, but chat was cleared locally.");
      }
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    const notification = document.createElement("div");
    notification.className = "copy-notification";
    notification.textContent = "Copied to clipboard!";
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  };

  const filteredChats = chats
    .filter((chat) => chat.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.id - a.id;
    });

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  const openFilePreview = (file) => {
    setPreviewFile(file);
    setIsSidebarCollapsed(true);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    inputRef.current?.focus();
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
    document.body.className = isDarkMode ? "dark-mode" : "";
  }, [chats, currentChat, isDarkMode]);

  const Message = ({ item }) => {
    return (
      <div className={`MessageWrapper ${item.type}`}>
        {item.type === "user" && (
          <div className="ChatBubble UserBubble">
            <div className="MessageHeader">
              <User size={16} />
              <span className="Timestamp">{item.timestamp}</span>
            </div>
            <div className="MessageContent">
              {item.content}
              {item.file && (
                <div className="FileAttachment" onClick={() => openFilePreview(item.file)}>
                  <FileText size={16} />
                  <span>{typeof item.file === 'string' ? item.file : item.file.name}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {item.type === "response" && (
          <div className="ChatBubble ResponseBubble">
            <div className="MessageHeader">
              <div className="BotIcon">🤖</div>
              <span className="Timestamp">{item.timestamp}</span>
            </div>
            <div className="MessageContent">
              <ReactMarkdown
                rehypePlugins={[rehypeHighlight]}
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline ? (
                      <div className="code-block">
                        <div className="code-header">
                          <span>{match ? match[1] : 'code'}</span>
                          <button
                            onClick={() => copyToClipboard(String(children))}
                            title="Copy code"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }) {
                    return <div className="table-container"><table>{children}</table></div>;
                  }
                }}
              >
                {item.content}
              </ReactMarkdown>
            </div>
            <div className="MessageActions">
              <button onClick={() => copyToClipboard(item.content)} title="Copy response">
                <Copy size={16} />
              </button>
            </div>
          </div>
        )}

        {item.type === "error" && (
          <div className="ChatBubble ErrorBubble">
            <div className="MessageHeader">
              <AlertTriangle size={16} />
              <span className="Timestamp">{item.timestamp}</span>
            </div>
            <div className="MessageContent">
              {item.content}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSummarize = () => {
    if (selectedFile) {
      handleQuerySubmit(true);
    } else {
      setError("Please upload a document first to summarize");
    }
  };

  return (
    <div className={`Mainpage ${isDarkMode ? "dark-mode" : ""}`} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()}>
      <div className={`Sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
        <div className="SidebarTop">
          {!isSidebarCollapsed && <h1 className="AppTitle">InsightPaper</h1>}
          <button className="NewChatButton" onClick={handleNewChat}>
            {isSidebarCollapsed ? <Plus size={20} /> : <><Plus size={20} /> New Chat</>}
          </button>
        </div>
        
        {isSidebarCollapsed ? (
          <ul className="HistoryList">
            {filteredChats.map((chat) => (
              <li
                key={chat.id}
                className={`HistoryItem ${chat.id === currentChat ? "active" : ""} ${chat.pinned ? "pinned" : ""}`}
                onClick={() => setCurrentChat(chat.id)}
                title={chat.name}
              >
                <MessageSquare size={20} />
              </li>
            ))}
          </ul>
        ) : (
          <>
            <div className="SearchBox">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="ClearSearchButton" onClick={() => setSearchQuery("")}>
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="SidebarHeader">
              <h2 className="SidebarTitle">History</h2>
              {currentChat && (
                <button className="ClearChatButton" onClick={clearChat} title="Clear current chat">
                  <Trash size={16} />
                </button>
              )}
            </div>
            <ul className="HistoryList">
              {filteredChats.map((chat) => (
                <li
                  key={chat.id}
                  className={`HistoryItem ${chat.id === currentChat ? "active" : ""} ${chat.pinned ? "pinned" : ""}`}
                  onClick={() => setCurrentChat(chat.id)}
                >
                  {chat.pinned && <Pin size={16} />}
                  <span className="ChatName">{chat.name}</span>
                  <div className="ChatActions">
                    <button title="Edit chat name" onClick={(e) => editChat(chat.id, e)}>
                      <Edit size={16} />
                    </button>
                    <button title="Delete chat" onClick={(e) => deleteChat(chat.id, e)}>
                      <Trash2 size={16} />
                    </button>
                    <button 
                      title={chat.pinned ? "Unpin chat" : "Pin chat"} 
                      onClick={(e) => pinChat(chat.id, e)}
                      style={{ color: chat.id === currentChat ? '#004aad' : 'white' }}
                    >
                      <Pin size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        
        <div className="AccountSection">
          <button className="AccountButton" onClick={() => setShowAccountMenu(!showAccountMenu)}>
            <User size={20} />
            {!isSidebarCollapsed && <span>{user?.username || (user?.isGuest ? 'Guest' : 'Account')}</span>}
          </button>
          {showAccountMenu && (
            <div className="AccountMenu">
              {user && !user.isGuest ? (
                <>
                  <div className="AccountInfo">
                    <div className="AccountEmail">{user.email}</div>
                    <div className="AccountUsername">@{user.username}</div>
                  </div>
                  <button onClick={toggleDarkMode}>
                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </button>
                  <button onClick={() => alert("Settings coming soon!")}>
                    <Settings size={18} /> Settings
                  </button>
                  <button onClick={handleLogout}>
                    <LogOut size={18} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => navigate('/login')}>
                    <LogIn size={18} /> Sign In
                  </button>
                  <button onClick={() => navigate('/login', { state: { showRegister: true } })}>
                    <UserPlus size={18} /> Register
                  </button>
                  <div className="GuestWarning">
                    <AlertCircle size={18} />
                    <span>Guest session - history won't be saved</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      <button className="CollapseButton" onClick={toggleSidebar}>
        <ChevronLeft size={20} style={{ transform: isSidebarCollapsed ? "rotate(180deg)" : "none" }} />
      </button>

      <div className={`RightPanel ${previewFile ? "with-preview" : ""}`}>
        <div className="ChatContainer">
          <div className="ChatArea" ref={chatAreaRef}>
            {getCurrentChat().history && getCurrentChat().history.length > 0 ? (
              getCurrentChat().history.map((item, index) => (
                <Message key={index} item={item} />
              ))
            ) : (
              <div className="WelcomeMessage">
                <div className="WelcomeIllustration">
                  <FileText size={48} />
                </div>
                <h3>Welcome to InsightPaper</h3>
                {user?.isGuest && (
                  <div className="GuestNotification">
                    <AlertTriangle size={18} />
                    <p>You're in guest mode. Your chat history won't be saved.</p>
                  </div>
                )}
                <p>Upload a research paper or ask a question to get started.</p>
                <div className="TipsSection">
                  <h4>Try asking:</h4>
                  <ul>
                    <li>"Summarize the key findings of this paper"</li>
                    <li>"What methodology did the authors use?"</li>
                    <li>"Explain the results section"</li>
                    <li>"What are the limitations of this study?"</li>
                  </ul>
                </div>
              </div>
            )}
            {isLoading && (
              <div className="LoadingIndicator">
                <Loader2 className="animate-spin" size={24} />
                <span>Processing your request...</span>
              </div>
            )}
          </div>

          <div className="QueryBox">
            <label className="UploadLabel">
              <Paperclip size={22} className="UploadIcon" />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileSelection}
                hidden
              />
            </label>
            <textarea
              ref={inputRef}
              placeholder="Ask a question or upload a paper..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleQuerySubmit();
                }
              }}
              className="QueryInput"
              disabled={isLoading}
              rows={1}
            />
            <button
              className="SendButton"
              onClick={() => handleQuerySubmit()}
              disabled={isLoading || (query.trim() === "" && !selectedFile)}
              title="Send message"
            >
              {isLoading ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
            </button>
          </div>
          {selectedFile && (
            <div className="FilePreview">
              <div className="FileInfo">
                <FileText size={18} />
                <span>{selectedFile.name}</span>
              </div>
              <div className="FileActions">
                <button onClick={handleSummarize} title="Summarize document">
                  <FileText size={18} /> Summarize
                </button>
                <button onClick={() => openFilePreview(selectedFile)} title="Preview document">
                  <FileText size={18} /> Preview
                </button>
                <button onClick={removeFile} title="Remove file">
                  <X size={18} />
                </button>
              </div>
            </div>
          )}
          {error && (
            <div className="ErrorNotification">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X size={16} />
              </button>
            </div>
          )}
        </div>

        {previewFile && (
          <DocumentPreview file={previewFile} onClose={closePreview} />
        )}
      </div>
    </div>
  );
}

export default Mainpage;