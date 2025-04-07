import React, { useEffect, useCallback, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaTwitter, FaLinkedin, FaInstagram, FaFileUpload, FaBrain, FaQuestionCircle, FaArrowRight, FaCheck, FaChevronDown, FaChevronUp } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./LandingPage.css";
import logo from "./Insight Paper.png";
import Lottie from "lottie-react";
import personWorkingAnimation from "./Animation.json";

function LandingPage() {
  const navigate = useNavigate();
  const [activeFeature, setActiveFeature] = useState(0);
  const navbarRef = useRef(null);
  const [activeFaq, setActiveFaq] = useState(null);

  // Feature content
  const featureDetails = [
    {
      icon: <FaFileUpload className="feature-icon-large" />,
      title: "Easy Upload",
      description: "Simply upload your research paper in PDF or Docx format. Our system processes documents of any length quickly and efficiently.",
      points: [
        "Supports multiple file formats",
        "Drag & drop functionality",
        "Batch upload capability",
        "Secure file handling"
      ]
    },
    {
      icon: <FaBrain className="feature-icon-large" />,
      title: "AI Summarization",
      description: "Get concise, well-structured summaries with key insights extracted using our advanced AI algorithms.",
      points: [
        "Identifies key findings and methodology",
        "Extracts conclusions and implications",
        "Highlights research limitations",
        "Provides citation analysis"
      ]
    },
    {
      icon: <FaQuestionCircle className="feature-icon-large" />,
      title: "Interactive Q&A",
      description: "Ask AI follow-up questions on research papers and explore topics in depth with contextual understanding.",
      points: [
        "Natural language processing",
        "Context-aware responses",
        "Citation of relevant sections",
        "Follow-up question capabilities"
      ]
    }
  ];

  // FAQ Data
  const faqData = [
    {
      question: "How accurate is the AI summarization?",
      answer: "Our AI summarization achieves over 95% accuracy in extracting key information from research papers. The system has been trained on millions of academic papers across diverse fields, and continuously improves through machine learning. For highly technical or specialized content, the AI may provide contextual notes where appropriate."
    },
    {
      question: "What’s the difference between signing up and continuing as a guest?",
      answer: "If you sign up, your history is saved and you can use the dark theme. If you continue as a guest, your history won’t be saved, but you can still upload papers for summarization."
    },
    {
      question: "Is there a limit on paper length or file size?",
      answer: "Our Model can process papers up to 30 pages or 10MB in size"
    },
    {
      question: "How is my data protected?",
      answer: "We take data security seriously. All uploaded papers are encrypted during transit and storage. We do not share your documents with third parties, and you can choose to have your uploads automatically deleted after analysis. Our privacy-first approach means you retain full ownership of your content and research materials."
    },
    {
      question: "Can I use InsightPaper for my own research publications?",
      answer: "Absolutely! Many researchers use InsightPaper to analyze their own drafts before submission, identify areas for improvement, and ensure key findings are clearly communicated. The Q&A feature can help anticipate reviewer questions and strengthen your manuscript before publication."
    }
  ];


  // Toggle FAQ item
  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  // Auto-advance features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % featureDetails.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featureDetails.length]);

  useEffect(() => {
    const handleScroll = () => {
      if (navbarRef.current) {
        if (window.scrollY > 50) {
          navbarRef.current.classList.add("scrolled");
        } else {
          navbarRef.current.classList.remove("scrolled");
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleNavigate = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Button clicked at", new Date().toISOString(), "Navigating to /login");
    try {
      navigate("/login");
      console.log("Navigation triggered successfully");
    } catch (error) {
      console.error("Navigation failed:", error);
    }
  }, [navigate]);

  const handleContinueAsGuest = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log("Continue as guest clicked at", new Date().toISOString());
    try {
      navigate("/Main"); // Changed from "/continueasguest" to "/mainpage"
      console.log("Navigation to mainpage triggered successfully");
    } catch (error) {
      console.error("Navigation failed:", error);
    }
  }, [navigate]);

  // smooth scroll 
  const scrollToSection = useCallback((e) => {
    e.preventDefault();
    const targetId = e.currentTarget.getAttribute("href").substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop - 80, 
        behavior: "smooth"
      });
      console.log(`Scrolled to section: ${targetId}`);
    }
  }, []);

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg fixed-top" ref={navbarRef}>
        <div className="container">
          <a className="navbar-brand d-flex align-items-center animate__fadeIn" href="/">
            <img src={logo} alt="Logo" className="logo-img me-2" />
            InsightPaper
          </a>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link animate__fadeIn" href="#features" onClick={scrollToSection}>Features</a>
              </li>
              <li className="nav-item">
                <a className="nav-link animate__fadeIn" href="#how-it-works" onClick={scrollToSection}>How It Works</a>
              </li>
              <li className="nav-item">
                <a className="nav-link animate__fadeIn" href="#faqs" onClick={scrollToSection}>FAQs</a>
              </li>
              <li className="nav-item">
                <a className="nav-link animate__fadeIn" href="#contact" onClick={scrollToSection}>Contact Us</a>
              </li>
              <li className="nav-item">
                <button
                  className="btn get-started-btn animate__fadeIn"
                  onClick={handleNavigate}
                  type="button"
                >
                  Get Started
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero d-flex align-items-center">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 hero-content ms-lg-0">
              <h1 className="display-3 fw-bold animate__fadeInUp">
                AI-Powered <br /> Research Summarization
              </h1>
              <p className="lead my-4 animate__fadeInUp animate__delay-1s">
                Upload papers, get instant insights, and ask AI-powered questions.
              </p>
              <div className="hero-buttons">
                <button
                  className="btn btn-primary primary-btn animate__fadeInUp animate__delay-2s me-3"
                  onClick={handleNavigate}
                  type="button"
                >
                  Sign In
                </button>
                <button
                  className="btn btn-outline guest-btn animate__fadeInUp animate__delay-2s"
                  onClick={handleContinueAsGuest}
                  type="button"
                >
                  Continue as Guest
                </button>
              </div>
            </div>
            <div className="col-lg-6 text-center">
              <Lottie
                animationData={personWorkingAnimation}
                loop={true}
                autoplay={true}
                className="hero-illustration animate__fadeIn animate__delay-1s"
              />
            </div>
          </div>
        </div>
      </header>

      {/*Features Section */}
      <section id="features" className="features-new py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title display-5 fw-bold mb-3 animate__fadeInUp">
              Why Choose InsightPaper?
            </h2>
            <div className="title-underline"></div>
            <p className="section-subtitle">Streamline your research with our powerful features</p>
          </div>

          <div className="row feature-interactive-container">
            <div className="col-md-4">
              <div className="feature-selector">
                {featureDetails.map((feature, index) => (
                  <div
                    key={index}
                    className={`feature-tab ${activeFeature === index ? 'active' : ''}`}
                    onClick={() => setActiveFeature(index)}
                  >
                    <div className="feature-tab-icon">{feature.icon}</div>
                    <div className="feature-tab-content">
                      <h4>{feature.title}</h4>
                      <p className="d-none d-lg-block">{feature.description.substring(0, 50)}...</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-md-8">
              <div className="feature-display">
                <div className="feature-display-content">
                  <div className="feature-display-icon">{featureDetails[activeFeature].icon}</div>
                  <h3 className="feature-display-title">{featureDetails[activeFeature].title}</h3>
                  <p className="feature-display-desc">{featureDetails[activeFeature].description}</p>

                  <div className="feature-points mt-4">
                    {featureDetails[activeFeature].points.map((point, index) => (
                      <div key={index} className="feature-point">
                        <span className="feature-point-icon"><FaCheck /></span>
                        <span>{point}</span>
                      </div>
                    ))}
                  </div>

                  <button className="btn feature-btn mt-4" onClick={handleNavigate}>
                    Try It Now <FaArrowRight className="ms-2" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REDESIGNED How It Works Section */}
      <section id="how-it-works" className="how-it-works-new py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title display-5 fw-bold mb-3">How It Works</h2>
            <div className="title-underline"></div>
            <p className="section-subtitle">Three simple steps to transform your research experience</p>
          </div>

          <div className="workflow-timeline">
            <div className="workflow-container left">
              <div className="workflow-content">
                <span className="workflow-number">1</span>
                <h3>Upload Your Paper</h3>
                <p>Select and upload any research paper in PDF or DocX format. Our system securely handles your documents and prepares them for AI analysis.</p>
                <div className="workflow-image upload-image">
                  <div className="file-upload-icon">
                    <FaFileUpload />
                  </div>
                </div>
              </div>
            </div>

            <div className="workflow-container right">
              <div className="workflow-content">
                <span className="workflow-number">2</span>
                <h3>AI Processing</h3>
                <p>Our advanced AI technology processes the paper, extracting key findings, methodology, results, and conclusions. It identifies important citations and connections.</p>
                <div className="workflow-image processing-image">
                  <div className="processing-icon">
                    <FaBrain />
                  </div>
                </div>
              </div>
            </div>

            <div className="workflow-container left">
              <div className="workflow-content">
                <span className="workflow-number">3</span>
                <h3>Interact & Explore</h3>
                <p>Ask questions, request summaries, explore specific sections, or dive deeper into concepts mentioned in the paper with our interactive AI assistant.</p>
                <div className="workflow-image interact-image">
                  <div className="interact-icon">
                    <FaQuestionCircle />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-5">
            <button className="btn primary-btn" onClick={handleNavigate}>
              Start Your Research Journey
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faqs" className="faqs-section py-5">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title display-5 fw-bold mb-3 animate__fadeInUp">
              Frequently Asked Questions
            </h2>
            <div className="title-underline"></div>
            <p className="section-subtitle">Find answers to common questions about InsightPaper</p>
          </div>

          <div className="faq-container">
            {faqData.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${activeFaq === index ? 'active' : ''}`}
                data-aos="fade-up"
                data-aos-delay={index * 100}
              >
                <div className="faq-question" onClick={() => toggleFaq(index)}>
                  <h3>{faq.question}</h3>
                  <div className="faq-icon">
                    {activeFaq === index ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>
                <div className={`faq-answer ${activeFaq === index ? 'show' : ''}`}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-5">
            <p className="mb-3">Still have questions?</p>
            <a href="#contact" onClick={scrollToSection} className="btn feature-btn">
              Contact Us <FaArrowRight className="ms-2" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer bg-primary text-white py-4">
        <div className="container d-flex flex-column flex-md-row justify-content-between align-items-center">
          <p className="mb-2 mb-md-0 animate__fadeInUp">
            © 2025 InsightPaper | AI-powered research summarization
          </p>
          <div className="contact-section text-center text-md-end">
            <ul className="footer-nav list-unstyled d-flex flex-wrap justify-content-center justify-content-md-end gap-1 mb-3 animate__fadeInUp">
              <li>
                <a className="text-white text-decoration-none" href="#features" onClick={scrollToSection}>Features</a>
              </li>
              <li>
                <a className="text-white text-decoration-none" href="#how-it-works" onClick={scrollToSection}>How It Works</a>
              </li>
              <li>
                <a className="text-white text-decoration-none" href="#faqs" onClick={scrollToSection}>FAQs</a>
              </li>
              <li>
                <a className="text-white text-decoration-none" href="#contact" onClick={scrollToSection}>Contact</a>
              </li>
            </ul>
            <p className="mb-1 animate__fadeInUp animate__delay-1s">Contact us: insightpaper.team@gmail.com</p>
            <div className="social-icons d-flex justify-content-center justify-content-md-end gap-3 animate__fadeInUp animate__delay-2s">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-white fs-4">
                <FaTwitter />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-white fs-4">
                <FaLinkedin />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-white fs-4">
                <FaInstagram />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;