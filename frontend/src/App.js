import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import Home from './Home';
import CrudPage from './CrudPage'; 
import LoanPage from "./LoanPage";





function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/crud" element={<CrudPage />} />  
        <Route path="/loan/:id" element={<LoanPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
