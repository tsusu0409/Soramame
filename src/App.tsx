import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import CheckIn from './CheckIn';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<CheckIn />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
