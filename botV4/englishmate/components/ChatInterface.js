// components/ChatInterface.js

import { useState, useEffect } from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';

// Fetch Case Scenarios from Cohere LLM API
const fetchCaseScenarios = async () => {
  const response = await fetch('/api/cohere', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: "Suggest a list of common English conversation scenarios." }),
  });

  const data = await response.json();
  return data.text; // Adjust based on the response format from the LLM
};

// Fetch Conversation Details from Cohere API
const fetchScenarioDetails = async (scenario) => {
  const response = await fetch('/api/cohere', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: `Provide an English conversation for the scenario: "${scenario}".` }),
  });

  const data = await response.json();
  return data.text;
};

// Translate text using the translation API
const translateText = async (text, targetLang = 'bn') => {
  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, targetLang }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.translatedText;
};

// components/ChatInterface.js

const formatScenarioDetails = async (details) => {
  const lines = details.split('\n').filter(line => line.trim() !== "");

  const translationPromises = lines.map(async (line) => {
    const english = line.trim();
    try {
      const bangla = await translateText(english);
      return { english, bangla };
    } catch (error) {
      console.error('Translation failed for line:', english, error);
      return { english, bangla: "Translation unavailable: " + error.message };
    }
  });

  const formattedLines = await Promise.all(translationPromises);
  return formattedLines;
};


export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioDetails, setScenarioDetails] = useState([]);
  const [hasMore, setHasMore] = useState(true);

  // Fetch the list of scenarios
  const loadScenarios = async () => {
    try {
      const result = await fetchCaseScenarios();
      const newScenarios = result.split('\n').filter(scenario => scenario);

      // Prevent duplicates
      setScenarios((prev) => {
        const combined = [...prev, ...newScenarios];
        const uniqueScenarios = Array.from(new Set(combined));
        return uniqueScenarios;
      });

      // If API has a limit, set hasMore accordingly
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      setHasMore(false);
    }
  };

  useEffect(() => {
    if (showHelp) {
      setLoading(true);
      loadScenarios()
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }
  }, [showHelp]);

  // Handle Scenario Click and Fetch Conversation
  const handleScenarioClick = async (scenario) => {
    setLoading(true);
    try {
      const result = await fetchScenarioDetails(scenario);
      const formattedDetails = await formatScenarioDetails(result);
      setScenarioDetails(formattedDetails);
      setSelectedScenario(scenario);
    } catch (error) {
      console.error("Error fetching scenario details:", error);
      // Optionally, display an error message to the user
    } finally {
      setLoading(false);
    }
  };

  // Refresh Scenarios
  const refreshScenarios = () => {
    setScenarios([]);
    setSelectedScenario(null);
    setScenarioDetails([]);
    setHasMore(true);
    loadScenarios();
  };

// Send Message to Cohere API and Update State
const sendMessage = async () => {
  if (input.trim() !== "") {
    setMessages([...messages, { text: input, sender: 'user' }]);
    setLoading(true);

    try {
      const response = await fetchScenarioDetails(input);
      // Assuming the bot's response is in English
      const translatedResponse = await translateText(response);
      setMessages((prev) => [...prev, { text: translatedResponse, sender: 'bot' }]);
    } catch (error) {
      console.error('Error in sendMessage:', error);
      setMessages((prev) => [...prev, { text: `Error retrieving response: ${error.message}`, sender: 'bot' }]);
    }

    setInput('');
    setLoading(false);
  }
};


  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 text-gray-800">
      {/* Sidebar */}
      <div className="md:w-64 p-6 border-r flex flex-col bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <h2 className="text-3xl font-bold mb-6">EnglishMate</h2>
        <ul className="flex-1 space-y-6">
          <li 
            className="cursor-pointer hover:bg-indigo-700 p-3 rounded-md flex items-center"
            onClick={() => setShowHelp(true)}
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            10-Minute English Help
          </li>
          <li className="cursor-pointer hover:bg-indigo-700 p-3 rounded-md flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Grammar Basics
          </li>
          <li className="cursor-pointer hover:bg-indigo-700 p-3 rounded-md flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v-4h8v4m-8 4h8m-8-8h8M4 4h16v16H4V4z" />
            </svg>
            Vocabulary Lessons
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col shadow-lg overflow-auto">
        {showHelp ? (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-semibold">10-Minute English Help</h2>
              <button
                onClick={refreshScenarios}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <svg className="w-5 h-5 mr-2 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12v8h8" />
                  </svg>
                )}
                Refresh
              </button>
            </div>

            {showHelp && (
              <InfiniteScroll
                dataLength={scenarios.length}
                next={loadScenarios}
                hasMore={hasMore}
                loader={
                  <div className="flex justify-center items-center my-4">
                    <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                  </div>
                }
                endMessage={
                  <p className="text-center text-gray-500 mt-4">
                    <b>Yay! You have seen all scenarios.</b>
                  </p>
                }
              >
                {!selectedScenario ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {scenarios.map((scenario, index) => (
                      <div
                        key={index}
                        className="cursor-pointer p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col items-center"
                        onClick={() => handleScenarioClick(scenario)}
                      >
                        <svg className="w-12 h-12 mb-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m7-6h6m-6 4h6m-6-8h6"></path>
                        </svg>
                        <p className="text-center text-lg font-medium text-gray-700">{scenario}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6">
                    <button
                      className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-md flex items-center hover:bg-purple-700 transition-colors"
                      onClick={() => setSelectedScenario(null)}
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Scenarios
                    </button>

                    <h3 className="text-2xl font-semibold mb-4">Conversation for: {selectedScenario}</h3>
                    <div className="bg-white p-6 rounded-lg shadow-md">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-xl font-semibold mb-2 text-purple-600">English</h4>
                          <ul className="space-y-4">
                            {scenarioDetails.map((line, index) => (
                              <li key={index} className="p-4 bg-gray-100 rounded-md">
                                <p>{line.english}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xl font-semibold mb-2 text-indigo-600">বাংলা</h4>
                          <ul className="space-y-4">
                            {scenarioDetails.map((line, index) => (
                              <li key={index} className="p-4 bg-gray-100 rounded-md">
                                <p>{line.bangla}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </InfiniteScroll>
            )}
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="bg-purple-700 p-6 text-white flex items-center shadow-lg">
              <input
                type="text"
                placeholder="Type your English query here"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                className="w-full p-3 rounded-full border-none outline-none text-gray-800"
              />
            </div>

            {/* Chat History */}
            <div className="flex-1 p-6 overflow-y-auto bg-white space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 rounded-lg max-w-md ${message.sender === 'user' ? 'bg-purple-100 text-gray-800' : 'bg-gray-200 text-gray-800'}`}>
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-6 bg-gray-100 border-t flex items-center">
              <input
                type="text"
                placeholder="Type a new message..."
                className="flex-1 p-3 border border-gray-300 rounded-full outline-none"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage} className="ml-4 px-6 py-3 bg-purple-700 text-white rounded-full hover:bg-purple-800 transition-colors">
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Right Panel (Visible on desktop) */}
      <div className="hidden md:block md:w-64 p-6 border-l bg-gray-200 shadow-lg md:order-3">
        <div className="text-center">
          <img src="https://i.ibb.co/frrrVpd/tutor.png" alt="Chatbot" className="w-24 h-24 rounded-full mx-auto mb-6" />
          <h3 className="text-2xl font-semibold mb-2">EnglishMate AI Chatbot</h3>
          <p className="text-gray-600">Active now</p>
        </div>
        <div className="mt-8 text-sm text-gray-700 space-y-2">
          <p><strong>Position:</strong> English Language Tutor</p>
          <p><strong>Email:</strong> <a href="mailto:contact@englishmate.co" className="text-indigo-600 hover:underline">contact@englishmate.co</a></p>
          <p><strong>Local time:</strong> 11:58 AM</p>
        </div>
      </div>
    </div>
  );
}
