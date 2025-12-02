import React from 'react';
import { useAuthStore } from '../auth/store';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuthStore();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-600 p-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Sheep Dashboard</h1>
             <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded transition"
            >
                Logout
            </button>
        </div>

        <div className="p-6">
            <div className="flex items-center space-x-6 mb-8">
                {user.avatar_url ? (
                <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-24 h-24 rounded-full border-4 border-blue-100"
                />
                ) : (
                <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center text-3xl font-bold text-gray-600">
                    {user.username.charAt(0).toUpperCase()}
                </div>
                )}
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Welcome, {user.username}!</h2>
                    <p className="text-gray-500">Discord ID: {user.discord_id}</p>
                </div>
            </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                    <h3 className="text-xl font-semibold text-blue-800 mb-2">Member Status</h3>
                    <p className="text-blue-600">Verified Sheep Community Member</p>
                </div>
                 <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                    <h3 className="text-xl font-semibold text-green-800 mb-2">Project Access</h3>
                    <p className="text-green-600">Full Access Granted</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
