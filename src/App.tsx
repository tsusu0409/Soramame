import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './App.css';
import CheckIn from './CheckIn';
import Footer from './components/Footer';

function App() {
  return (
    <div>
      <main>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/" element={<CheckIn />} />
          </Routes>
        </BrowserRouter>
      </main>
    <Footer />
    </div>
  )
}

export default App
