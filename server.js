const express = require('express');
const multer = require('multer');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());

const SECRET = "cloudsecret";

let activeUsers = 0;
let servers = 1;
let logs = [];

// LOGIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "1234") {
        const token = jwt.sign({ user: username }, SECRET);
        res.json({ token });
    } else {
        res.status(401).send("Invalid login");
    }
});

// UPLOAD
app.post('/upload', upload.single('file'), async (req, res) => {
    const token = req.headers.authorization;
    try {
        jwt.verify(token, SECRET);
    } catch {
        return res.status(403).send("Unauthorized");
    }

    const originalName = req.file.originalname;
    const safeName = Date.now() + "_" + originalName;

    const password = req.body.password || "";
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    const expiry = Date.now() + (parseInt(req.body.expiry) || 3600000);

    const tempPath = req.file.path;
    const encryptedPath = `uploads/${safeName}.enc`;

    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    fs.createReadStream(tempPath)
        .pipe(cipher)
        .pipe(fs.createWriteStream(encryptedPath))
        .on('finish', () => {
            fs.unlinkSync(tempPath);

            const metadata = {
                filename: safeName + ".enc",
                original: originalName,
                key: key.toString('hex'),
                iv: iv.toString('hex'),
                password: hashedPassword,
                expiry
            };

            fs.writeFileSync(`uploads/${safeName}.json`, JSON.stringify(metadata));

            activeUsers++;
            logs.push(`Uploaded: ${originalName}`);

            if (activeUsers > servers * 2) servers++;

            res.json({ file: safeName + ".enc" });
        });
});

// VIEW (decrypt + open)
app.get('/view/:filename', async (req, res) => {
    const file = req.params.filename;

    const meta = JSON.parse(
        fs.readFileSync(`uploads/${file.replace('.enc', '.json')}`)
    );

    if (Date.now() > meta.expiry) return res.send("File expired");

    if (meta.password) {
        const pass = req.query.password;
        if (!pass || !(await bcrypt.compare(pass, meta.password))) {
            return res.send("Wrong password");
        }
    }

    const key = Buffer.from(meta.key, 'hex');
    const iv = Buffer.from(meta.iv, 'hex');

    const encryptedPath = `uploads/${file}`;
    const decryptedPath = encryptedPath + "_view";

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    fs.createReadStream(encryptedPath)
        .pipe(decipher)
        .pipe(fs.createWriteStream(decryptedPath))
        .on('finish', () => {
            res.setHeader('Content-Disposition', `inline; filename="${meta.original}"`);
            res.sendFile(path.resolve(decryptedPath));
        });
});

// FILES
app.get('/files', (req, res) => {
    const files = fs.readdirSync('uploads').filter(f => f.endsWith('.enc'));
    res.json(files);
});

// STATS
app.get('/stats', (req, res) => {
    res.json({ users: activeUsers, servers });
});

// LOGS
app.get('/logs', (req, res) => {
    res.json(logs);
});

// AUTO DELETE EXPIRED
setInterval(() => {
    const files = fs.readdirSync('uploads').filter(f => f.endsWith('.json'));

    files.forEach(file => {
        const meta = JSON.parse(fs.readFileSync(`uploads/${file}`));
        if (Date.now() > meta.expiry) {
            const base = file.replace('.json', '');
            fs.unlinkSync(`uploads/${base}.enc`);
            fs.unlinkSync(`uploads/${file}`);
        }
    });
}, 60000);

app.use(express.static('public'));

app.listen(3000, () => console.log("Server running http://localhost:3000"));