import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

import { preHeat } from './generate.js';

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root')
);

preHeat();
