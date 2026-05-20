const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
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
        width: 1440,
        height: 860,
        minWidth: 900,
        minHeight: 600,
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

const template = [
    {
        label: 'View',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ]
    },
    {
        label: 'Window',
        submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            { role: 'close' }
        ]
    }
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

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

ipcMain.on('export-pdf', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const pdfPath = await dialog.showSaveDialog(win, {
        title: 'Save Leave Card as PDF',
        defaultPath: 'Leave_Card_Report.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!pdfPath.canceled && pdfPath.filePath) {
        const options = {
            margins: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0
            },
            pageSize: 'A4',
            printBackground: true,
            landscape: true,
            preferCSSPageSize: true
        };

        try {
            const data = await win.webContents.printToPDF(options);
            fs.writeFileSync(pdfPath.filePath, data);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
        }
    }
});
