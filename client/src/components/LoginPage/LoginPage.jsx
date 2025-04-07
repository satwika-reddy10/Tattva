import React, { useState } from 'react';
import './LoginPage.css'; // Ensure the path is correct
import 'boxicons'; // Import Boxicons (if using a package)

const LoginPage = () => {
  const [isActive, setIsActive] = useState(false);
  const [loginMessage, setLoginMessage] = useState('');
  const [loginMessageType, setLoginMessageType] = useState(''); // 'success' or 'error'
  const [registerMessage, setRegisterMessage] = useState('');
  const [registerMessageType, setRegisterMessageType] = useState(''); // 'success' or 'error'

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const username = e.target[0].value;
    const password = e.target[1].value;

    // Clear previous messages
    setLoginMessage('');

    try {
      const response = await fetch("http://localhost:5000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      // Log the response for debugging
      console.log("Login response:", response.status, data);

      // Check if the response contains a token (which indicates success)
      if (data.token) {
        setLoginMessage("Login successful!");
        setLoginMessageType("success");

        // Store both token and user data
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user)); // Ensure user object is stored

        // Delay navigation to allow user to see the success message
        setTimeout(() => {
          window.location.href = "/Main"; // Redirect to main page
        }, 1000);
      } else {
        // Display the error message from the server or a default message
        setLoginMessage(data.message || "Username or password is incorrect");
        setLoginMessageType("error");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginMessage("Connection error. Please try again later.");
      setLoginMessageType("error");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const username = e.target[0].value;
    const email = e.target[1].value;
    const password = e.target[2].value;

    // Clear previous messages
    setRegisterMessage('');

    try {
      const response = await fetch("http://localhost:5000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      // Log the response for debugging
      console.log("Register response:", response.status, data);

      if (response.ok || data.success) {
        setRegisterMessage(data.message || "Registration successful!");
        setRegisterMessageType("success");
      } else {
        setRegisterMessage(data.message || "Registration failed. Please try again.");
        setRegisterMessageType("error");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setRegisterMessage("Connection error. Please try again later.");
      setRegisterMessageType("error");
    }
  };

  return (
    <div className="auth-container">
      <div className={`wrapper ${isActive ? 'active' : ''}`}>
        <span className="rotate-bg"></span>
        <span className="rotate-bg2"></span>

        <div className="form-box login">
          <h2 className="animation" style={{ "--i": 0, "--j": 21 }}>Login</h2>
          <form onSubmit={handleLoginSubmit}>
            <div className="input-box animation" style={{ "--i": 1, "--j": 22 }}>
              <input type="text" required />
              <label>Username</label>
              <i className="bx bxs-user"></i>
            </div>

            <div className="input-box animation" style={{ "--i": 2, "--j": 23 }}>
              <input type="password" required />
              <label>Password</label>
              <i className="bx bxs-lock-alt"></i>
            </div>

            {loginMessage && (
              <div
                className={`message-container animation ${loginMessageType}`}
                style={{ "--i": 2.5, "--j": 23.5 }}
              >
                {loginMessage}
              </div>
            )}

            <button type="submit" className="btn animation" style={{ "--i": 3, "--j": 24 }}>
              Login
            </button>

            <div className="linkTxt animation" style={{ "--i": 5, "--j": 25 }}>
              <p>
                Don't have an account?{" "}
                <a
                  href="#"
                  className="register-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsActive(true);
                    setLoginMessage('');
                  }}
                >
                  Sign Up
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="info-text login">
          <h2 className="animation" style={{ "--i": 0, "--j": 20 }}>Welcome Back!</h2>
          <p className="animation" style={{ "--i": 1, "--j": 21 }}>
            Continue your research with AI-powered summarization.
          </p>
        </div>

        <div className="form-box register">
          <h2 className="animation" style={{ "--i": 17, "--j": 0 }}>Sign Up</h2>
          <form onSubmit={handleRegisterSubmit}>
            <div className="input-box animation" style={{ "--i": 18, "--j": 1 }}>
              <input type="text" required />
              <label>Username</label>
              <i className="bx bxs-user"></i>
            </div>

            <div className="input-box animation" style={{ "--i": 19, "--j": 2 }}>
              <input type="email" required />
              <label>Email</label>
              <i className="bx bxs-envelope"></i>
            </div>

            <div className="input-box animation" style={{ "--i": 20, "--j": 3 }}>
              <input type="password" required />
              <label>Password</label>
              <i className="bx bxs-lock-alt"></i>
            </div>

            {registerMessage && (
              <div
                className={`message-container animation ${registerMessageType}`}
                style={{ "--i": 20.5, "--j": 3.5 }}
              >
                {registerMessage}
              </div>
            )}

            <button type="submit" className="btn animation" style={{ "--i": 21, "--j": 4 }}>
              Sign Up
            </button>

            <div className="linkTxt animation" style={{ "--i": 22, "--j": 5 }}>
              <p>
                Already have an account?{" "}
                <a
                  href="#"
                  className="login-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsActive(false);
                    setRegisterMessage('');
                  }}
                >
                  Login
                </a>
              </p>
            </div>
          </form>
        </div>

        <div className="info-text register">
          <h2 className="animation" style={{ "--i": 17, "--j": 0 }}>Welcome!</h2>
          <p className="animation" style={{ "--i": 18, "--j": 1 }}>
            Create an account to explore AI-powered research insights.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
