const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// 1. Determine environment
const isDev = !app.isPackaged;

// 2. Start Backend Server
try {
    require('./server/index.js');
    console.log('Backend server started successfully.');
} catch (err) {
    console.error('Failed to start backend server:', err);
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: "ELRMS - Employee Leave Record Management System",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        const indexPath = path.join(__dirname, 'client/dist/index.html');
        if (fs.existsSync(indexPath)) {
            mainWindow.loadFile(indexPath);
        } else {
            console.error('Frontend build not found at:', indexPath);
        }
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
