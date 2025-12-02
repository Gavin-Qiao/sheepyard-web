import React from 'react';

const Login: React.FC = () => {
  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Are you a Sheep?</h1>
      <button
        onClick={handleLogin}
        className="px-6 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105"
      >
        Login with Discord
      </button>
    </div>
  );
};

export default Login;
