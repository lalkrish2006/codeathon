import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('customer'); // Default role
  const [error, setError] = useState('');
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        await register(name, email, password, role);
        // After register, verify login automatically or ask to login
        await login(email, password);
      } else {
        await login(email, password);
      }
      
      // Redirect based on role (read from user object if possible, or state)
      // Actually login returns user, but state update might be async-ish in context, 
      // but the promise result is immediate.
      // Re-read user from context or just trust the selection for now.
      
      // Better: Retrieve user from login response
      /* 
         Inside AuthContext login returns user. 
         Wait, I need to check my implementation. Yes, returns user.
      */
      
      // Simple redirect map
      const targetRole = isRegister ? role : (await login(email, password)).role; 
      // Oops double login call if I did valid check above.
      // Let's refactor slightly to be safer
      
      if (targetRole === 'admin') navigate('/admin');
      else if (targetRole === 'delivery_agent') navigate('/agent');
      else if (targetRole === 'seller') navigate('/seller');
      else navigate('/customer');

    } catch (err) {
        // If login called inside if/else above failed, we catch here
        // If double call, might be messy. Optimized flow:
        /*
          if (isRegister) await register(...)
          const user = await login(...)
          redirect(user.role)
        */
       // The above logic had a small flaw calling login twice in 'else' branch or logic.
       // Corrected logic:
    }
  };
  
  const handleRealSubmit = async (e) => {
      e.preventDefault();
      setError('');
      try {
          if (isRegister) {
              await register(name, email, password, role);
          }
          const user = await login(email, password);
          if (user.role === 'admin') navigate('/admin');
          else if (user.role === 'delivery_agent') navigate('/agent'); 
          // Note: Route isn't made yet, but we will make it
          else if (user.role === 'seller') navigate('/seller'); // Optional
          else navigate('/customer');
          
      } catch (err) {
          setError(err.toString());
      }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h2 className="mb-6 text-center text-2xl font-bold font-sans">
          {isRegister ? 'Create Account' : 'Sign In'}
        </h2>
        
        {error && <div className="mb-4 rounded bg-red-100 p-2 text-red-600">{error}</div>}

        <form onSubmit={handleRealSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                required
                className="mt-1 w-full rounded border p-2 focus:border-blue-500 focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              required
              className="mt-1 w-full rounded border p-2 focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              required
              className="mt-1 w-full rounded border p-2 focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          {isRegister && (
             <div>
               <label className="block text-sm font-medium text-gray-700">Role</label>
               <select 
                 className="mt-1 w-full rounded border p-2"
                 value={role}
                 onChange={(e) => setRole(e.target.value)}
               >
                   <option value="customer">Customer</option>
                   <option value="admin">Admin (Delivery Manager)</option>
                   <option value="seller">Seller</option>
                   <option value="delivery_agent">Delivery Agent</option>
               </select>
             </div>
          )}

          <button
            type="submit"
            className="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 transition"
          >
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-blue-600 hover:underline"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
